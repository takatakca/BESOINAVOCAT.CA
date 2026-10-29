'use strict';

// Workspace tools of the portal (D-028): adjustable viewer, video messages, a Word-like editor saving .docx, a drawing
// board and image annotation, and the mobile shell (drawer, tab bar, swipe between sections). Everything runs in the
// browser under the portal's CSP: no inline script or style, no request to another origin. Files leave the page only
// through the bridge given by app.js, which posts them to the case like any other piece.
(() => {
  // ---------- ZIP (stored entries) and Office Open XML, without dependencies ----------
  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  })();
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i += 1) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  const utf8 = (text) => new TextEncoder().encode(text);
  function dosDateTime(when) {
    const year = Math.max(1980, when.getFullYear());
    return {
      time: (when.getHours() << 11) | (when.getMinutes() << 5) | Math.floor(when.getSeconds() / 2),
      date: ((year - 1980) << 9) | ((when.getMonth() + 1) << 5) | when.getDate(),
    };
  }
  // Stored (uncompressed) ZIP: Word, PowerPoint and LibreOffice all read it; CRC32 keeps each entry verifiable.
  function zipStore(files, when = new Date()) {
    const { time, date } = dosDateTime(when);
    const locals = [], centrals = [];
    let offset = 0;
    for (const file of files) {
      const name = utf8(file.name), data = typeof file.data === 'string' ? utf8(file.data) : new Uint8Array(file.data.buffer, file.data.byteOffset, file.data.byteLength);
      const crc = crc32(data);
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true); local.setUint16(8, 0, true);
      local.setUint16(10, time, true); local.setUint16(12, date, true); local.setUint32(14, crc, true);
      local.setUint32(18, data.length, true); local.setUint32(22, data.length, true); local.setUint16(26, name.length, true); local.setUint16(28, 0, true);
      const central = new DataView(new ArrayBuffer(46));
      central.setUint32(0, 0x02014b50, true); central.setUint16(4, 20, true); central.setUint16(6, 20, true); central.setUint16(8, 0x0800, true);
      central.setUint16(10, 0, true); central.setUint16(12, time, true); central.setUint16(14, date, true); central.setUint32(16, crc, true);
      central.setUint32(20, data.length, true); central.setUint32(24, data.length, true); central.setUint16(28, name.length, true);
      central.setUint32(42, offset, true);
      locals.push(new Uint8Array(local.buffer), name, data);
      centrals.push(new Uint8Array(central.buffer), name);
      offset += 30 + name.length + data.length;
    }
    const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, centralSize, true); end.setUint32(16, offset, true);
    const parts = [...locals, ...centrals, new Uint8Array(end.buffer)];
    const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
    let at = 0;
    for (const part of parts) { out.set(part, at); at += part.length; }
    return out;
  }
  async function inflateRaw(bytes) {
    if (typeof DecompressionStream !== 'function') throw new Error('Ce navigateur ne sait pas lire ce document compressé.');
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  // Reads the entries named in `wanted` (or all) from a ZIP; stored and deflated entries only.
  async function unzip(bytes, wanted = null) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let end = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i -= 1) if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
    if (end < 0) throw new Error('Document illisible : archive Office incomplète.');
    const count = view.getUint16(end + 10, true);
    let at = view.getUint32(end + 16, true);
    const entries = new Map(), decoder = new TextDecoder();
    for (let n = 0; n < count && at + 46 <= bytes.length; n += 1) {
      if (view.getUint32(at, true) !== 0x02014b50) break;
      const method = view.getUint16(at + 10, true), compressed = view.getUint32(at + 20, true), size = view.getUint32(at + 24, true);
      const nameLength = view.getUint16(at + 28, true), extra = view.getUint16(at + 30, true), comment = view.getUint16(at + 32, true);
      const local = view.getUint32(at + 42, true);
      const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));
      at += 46 + nameLength + extra + comment;
      if (wanted && !wanted.includes(name)) continue;
      const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
      const raw = bytes.subarray(start, start + (method === 0 ? size : compressed));
      if (method === 0) entries.set(name, raw);
      else if (method === 8) entries.set(name, await inflateRaw(raw));
    }
    return entries;
  }
  const xml = (value) => String(value ?? '').replace(/[^\u0009\u000a\u000d -퟿-�]/gu, '')
    .replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);
  const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const OFFICE_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  function runXml(run) {
    const props = `${run.b ? '<w:b/>' : ''}${run.i ? '<w:i/>' : ''}${run.u ? '<w:u w:val="single"/>' : ''}`;
    const pieces = String(run.text).split(/(\n|\t)/u).map((piece) => piece === '\n' ? '<w:br/>' : piece === '\t' ? '<w:tab/>' : piece ? `<w:t xml:space="preserve">${xml(piece)}</w:t>` : '').join('');
    return pieces ? `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}${pieces}</w:r>` : '';
  }
  // Blocks: { type: 'p' | 'h1' | 'h2' | 'li', list: 'bullet' | 'number', listId, runs: [{ text, b, i, u }] }.
  function docxFromBlocks(blocks, { title = 'Document', when = new Date() } = {}) {
    const numbered = [...new Set(blocks.filter((block) => block.type === 'li' && block.list === 'number').map((block) => block.listId ?? 0))];
    const numberFor = (block) => block.list === 'number' ? 3 + numbered.indexOf(block.listId ?? 0) : 1;
    const body = blocks.map((block) => {
      const style = block.type === 'h1' ? 'Heading1' : block.type === 'h2' ? 'Heading2' : block.type === 'li' ? 'ListParagraph' : '';
      const props = style ? `<w:pPr><w:pStyle w:val="${style}"/>${block.type === 'li' ? `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${numberFor(block)}"/></w:numPr>` : ''}</w:pPr>` : '';
      return `<w:p>${props}${(block.runs || []).map(runXml).join('')}</w:p>`;
    }).join('');
    const document = `${XML_HEAD}<w:document xmlns:w="${W_NS}" xmlns:r="${OFFICE_REL}"><w:body>${body || '<w:p/>'}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
    const styles = `${XML_HEAD}<w:styles xmlns:w="${W_NS}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia" w:cs="Georgia" w:eastAsia="Georgia"/><w:sz w:val="23"/><w:szCs w:val="23"/><w:lang w:val="fr-CA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>`
      + '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'
      + '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/><w:color w:val="13233A"/><w:sz w:val="34"/><w:szCs w:val="34"/></w:rPr></w:style>'
      + '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/><w:color w:val="13233A"/><w:sz w:val="27"/><w:szCs w:val="27"/></w:rPr></w:style>'
      + '<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="60"/><w:ind w:left="720"/></w:pPr></w:style></w:styles>';
    const level = (format, text) => `<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="${format}"/><w:lvlText w:val="${text}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>`;
    const numbering = `${XML_HEAD}<w:numbering xmlns:w="${W_NS}"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/>${level('bullet', '•')}</w:abstractNum><w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="singleLevel"/>${level('decimal', '%1.')}</w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>${numbered.map((_, index) => `<w:num w:numId="${3 + index}"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>`).join('')}</w:numbering>`;
    const stamp = when.toISOString().replace(/\.\d{3}Z$/u, 'Z');
    return zipStore([
      { name: '[Content_Types].xml', data: `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>` },
      { name: '_rels/.rels', data: `${XML_HEAD}<Relationships xmlns="${REL_NS}"><Relationship Id="rId1" Type="${OFFICE_REL}/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="${OFFICE_REL}/extended-properties" Target="docProps/app.xml"/></Relationships>` },
      { name: 'word/_rels/document.xml.rels', data: `${XML_HEAD}<Relationships xmlns="${REL_NS}"><Relationship Id="rId1" Type="${OFFICE_REL}/styles" Target="styles.xml"/><Relationship Id="rId2" Type="${OFFICE_REL}/numbering" Target="numbering.xml"/></Relationships>` },
      { name: 'word/document.xml', data: document },
      { name: 'word/styles.xml', data: styles },
      { name: 'word/numbering.xml', data: numbering },
      { name: 'docProps/core.xml', data: `${XML_HEAD}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xml(title)}</dc:title><dc:creator>BesoinAvocat</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${stamp}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${stamp}</dcterms:modified></cp:coreProperties>` },
      { name: 'docProps/app.xml', data: `${XML_HEAD}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>BesoinAvocat</Application></Properties>` },
    ], when);
  }
  const truthy = (node) => node && !['0', 'false', 'none'].includes(node.getAttributeNS(W_NS, 'val') || node.getAttribute('w:val') || '');
  // Reads paragraphs, headings, lists and bold/italic/underline from word/document.xml; tables are read as paragraphs.
  function blocksFromDocx(documentXml, numberingXml, Parser = globalThis.DOMParser) {
    const parse = (text) => new Parser().parseFromString(text, 'application/xml');
    const formats = new Map();
    if (numberingXml) {
      const numbering = parse(numberingXml), abstract = new Map();
      for (const node of numbering.getElementsByTagNameNS(W_NS, 'abstractNum')) {
        const first = node.getElementsByTagNameNS(W_NS, 'numFmt')[0];
        abstract.set(node.getAttributeNS(W_NS, 'abstractNumId') || node.getAttribute('w:abstractNumId'), first?.getAttributeNS(W_NS, 'val') || first?.getAttribute('w:val'));
      }
      for (const node of numbering.getElementsByTagNameNS(W_NS, 'num')) {
        const ref = node.getElementsByTagNameNS(W_NS, 'abstractNumId')[0];
        formats.set(node.getAttributeNS(W_NS, 'numId') || node.getAttribute('w:numId'), abstract.get(ref?.getAttributeNS(W_NS, 'val') || ref?.getAttribute('w:val')));
      }
    }
    const blocks = [];
    for (const paragraph of parse(documentXml).getElementsByTagNameNS(W_NS, 'p')) {
      const styleNode = paragraph.getElementsByTagNameNS(W_NS, 'pStyle')[0];
      const style = (styleNode?.getAttributeNS(W_NS, 'val') || styleNode?.getAttribute('w:val') || '').toLowerCase();
      const numId = paragraph.getElementsByTagNameNS(W_NS, 'numId')[0];
      const numValue = numId?.getAttributeNS(W_NS, 'val') || numId?.getAttribute('w:val');
      const runs = [];
      for (const run of paragraph.getElementsByTagNameNS(W_NS, 'r')) {
        const props = run.getElementsByTagNameNS(W_NS, 'rPr')[0];
        const flag = (name) => truthy(props?.getElementsByTagNameNS(W_NS, name)[0]);
        let text = '';
        for (const child of run.childNodes) {
          if (child.localName === 't') text += child.textContent;
          else if (child.localName === 'tab') text += '\t';
          else if (child.localName === 'br' || child.localName === 'cr') text += '\n';
        }
        if (text) runs.push({ text, b: flag('b'), i: flag('i'), u: flag('u') });
      }
      if (numValue && numValue !== '0') blocks.push({ type: 'li', list: formats.has(numValue) && formats.get(numValue) !== 'bullet' ? 'number' : 'bullet', listId: numValue, runs });
      else if (/^(heading|titre)1$|^title$/u.test(style)) blocks.push({ type: 'h1', runs });
      else if (/^(heading|titre)[2-9]$|^subtitle$/u.test(style)) blocks.push({ type: 'h2', runs });
      else blocks.push({ type: 'p', runs });
    }
    return blocks;
  }
  const blocksText = (blocks) => blocks.map((block) => block.runs.map((run) => run.text).join('')).join('\n').replace(/\n{3,}/gu, '\n\n').trim();

  // ---------- PowerPoint (.pptx): a title slide and one slide per image, with its caption ----------
  const P_NS = 'http://schemas.openxmlformats.org/presentationml/2006/main';
  const A_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main';
  const SLIDE_W = 12192000, SLIDE_H = 6858000;
  function textBox(id, name, x, y, w, h, paragraphs, { size = 1800, bold = false, color = '0F1B2D' } = {}) {
    const body = paragraphs.map((text) => `<a:p><a:r><a:rPr lang="fr-CA" sz="${size}"${bold ? ' b="1"' : ''} dirty="0"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="Arial"/></a:rPr><a:t>${xml(text)}</a:t></a:r></a:p>`).join('') || '<a:p><a:endParaRPr lang="fr-CA"/></a:p>';
    return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${xml(name)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="square" rtlCol="0"><a:normAutofit/></a:bodyPr><a:lstStyle/>${body}</p:txBody></p:sp>`;
  }
  function slideXml(shapes, background = 'FFFFFF') {
    return `${XML_HEAD}<p:sld xmlns:a="${A_NS}" xmlns:r="${OFFICE_REL}" xmlns:p="${P_NS}"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="${background}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${shapes}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
  }
  // slides: [{ title, caption: [lines], image: { data: Uint8Array, ext: 'png' | 'jpeg', width, height } }]
  function pptxFromSlides(slides, { title = 'Présentation', subtitle = '', when = new Date() } = {}) {
    const all = [{ cover: true, title, caption: subtitle ? [subtitle] : [] }, ...slides];
    const files = [], media = [];
    const slideParts = all.map((slide, index) => {
      const n = index + 1;
      let shapes, rels = `${XML_HEAD}<Relationships xmlns="${REL_NS}"><Relationship Id="rId1" Type="${OFFICE_REL}/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>`;
      if (slide.cover) {
        shapes = `<p:sp><p:nvSpPr><p:cNvPr id="2" name="Bande"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="228600" cy="${SLIDE_H}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="8B2132"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr></p:sp>`
          + textBox(3, 'Titre', 914400, 2286000, 10363200, 1143000, [slide.title], { size: 4000, bold: true, color: 'FFFFFF' })
          + textBox(4, 'Sous-titre', 914400, 3505200, 10363200, 1371600, slide.caption, { size: 1800, color: 'C9D3E2' })
          + textBox(5, 'Mention', 914400, 5943600, 10363200, 457200, ['Préparé dans l’espace de travail BesoinAvocat — document de préparation, à valider avec votre avocat.'], { size: 1100, color: '8FA0B8' });
      } else {
        const titleHeight = 777240, captionHeight = slide.caption?.length ? Math.min(1554480, 320040 * slide.caption.length + 182880) : 0;
        shapes = textBox(2, 'Titre', 457200, 228600, SLIDE_W - 914400, titleHeight, [slide.title || `Diapositive ${n}`], { size: 2600, bold: true, color: '13233A' });
        if (slide.image) {
          const areaW = SLIDE_W - 914400, areaH = SLIDE_H - 228600 - titleHeight - captionHeight - 457200;
          const ratio = Math.min(areaW / slide.image.width, areaH / slide.image.height);
          const w = Math.round(slide.image.width * ratio), h = Math.round(slide.image.height * ratio);
          const x = Math.round((SLIDE_W - w) / 2), y = 228600 + titleHeight + Math.round((areaH - h) / 2);
          const file = `image${media.length + 1}.${slide.image.ext === 'jpeg' ? 'jpeg' : 'png'}`;
          media.push({ name: `ppt/media/${file}`, data: slide.image.data });
          rels += `<Relationship Id="rId2" Type="${OFFICE_REL}/image" Target="../media/${file}"/>`;
          shapes += `<p:pic><p:nvPicPr><p:cNvPr id="3" name="${xml(slide.title || 'Image')}" descr="${xml(slide.alt || slide.title || 'Image')}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
        }
        if (captionHeight) shapes += textBox(4, 'Légende', 457200, SLIDE_H - captionHeight - 228600, SLIDE_W - 914400, captionHeight, slide.caption, { size: 1500, color: '26344A' });
      }
      files.push({ name: `ppt/slides/slide${n}.xml`, data: slideXml(shapes, slide.cover ? '13233A' : 'FFFFFF') });
      files.push({ name: `ppt/slides/_rels/slide${n}.xml.rels`, data: `${rels}</Relationships>` });
      return n;
    });
    const stamp = when.toISOString().replace(/\.\d{3}Z$/u, 'Z');
    const master = `${XML_HEAD}<p:sldMaster xmlns:a="${A_NS}" xmlns:r="${OFFICE_REL}" xmlns:p="${P_NS}"><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle><a:lvl1pPr><a:defRPr sz="3200"/></a:lvl1pPr></p:titleStyle><p:bodyStyle><a:lvl1pPr><a:defRPr sz="1800"/></a:lvl1pPr></p:bodyStyle><p:otherStyle><a:lvl1pPr><a:defRPr sz="1800"/></a:lvl1pPr></p:otherStyle></p:txStyles></p:sldMaster>`;
    const layout = `${XML_HEAD}<p:sldLayout xmlns:a="${A_NS}" xmlns:r="${OFFICE_REL}" xmlns:p="${P_NS}" type="blank" preserve="1"><p:cSld name="Vide"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;
    const scheme = (name, colors) => `<a:${name}>${colors}</a:${name}>`;
    const srgb = (value) => `<a:srgbClr val="${value}"/>`;
    const theme = `${XML_HEAD}<a:theme xmlns:a="${A_NS}" name="BesoinAvocat"><a:themeElements><a:clrScheme name="BesoinAvocat">${scheme('dk1', srgb('0F1B2D'))}${scheme('lt1', srgb('FFFFFF'))}${scheme('dk2', srgb('13233A'))}${scheme('lt2', srgb('F4F5F8'))}${scheme('accent1', srgb('8B2132'))}${scheme('accent2', srgb('1B2F4D'))}${scheme('accent3', srgb('1F7A4C'))}${scheme('accent4', srgb('7A5710'))}${scheme('accent5', srgb('5B6576'))}${scheme('accent6', srgb('2F5FA7'))}${scheme('hlink', srgb('2F5FA7'))}${scheme('folHlink', srgb('6F1A28'))}</a:clrScheme><a:fontScheme name="BesoinAvocat"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="BesoinAvocat"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;
    const presentation = `${XML_HEAD}<p:presentation xmlns:a="${A_NS}" xmlns:r="${OFFICE_REL}" xmlns:p="${P_NS}" saveSubsetFonts="1"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slideParts.map((n) => `<p:sldId id="${255 + n}" r:id="rId${n + 2}"/>`).join('')}</p:sldIdLst><p:sldSz cx="${SLIDE_W}" cy="${SLIDE_H}"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle><a:lvl1pPr><a:defRPr lang="fr-CA"/></a:lvl1pPr></p:defaultTextStyle></p:presentation>`;
    const presentationRels = `${XML_HEAD}<Relationships xmlns="${REL_NS}"><Relationship Id="rId1" Type="${OFFICE_REL}/slideMaster" Target="slideMasters/slideMaster1.xml"/><Relationship Id="rId2" Type="${OFFICE_REL}/theme" Target="theme/theme1.xml"/>${slideParts.map((n) => `<Relationship Id="rId${n + 2}" Type="${OFFICE_REL}/slide" Target="slides/slide${n}.xml"/>`).join('')}</Relationships>`;
    const types = `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${slideParts.map((n) => `<Override PartName="/ppt/slides/slide${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`;
    return zipStore([
      { name: '[Content_Types].xml', data: types },
      { name: '_rels/.rels', data: `${XML_HEAD}<Relationships xmlns="${REL_NS}"><Relationship Id="rId1" Type="${OFFICE_REL}/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="${OFFICE_REL}/extended-properties" Target="docProps/app.xml"/></Relationships>` },
      { name: 'ppt/presentation.xml', data: presentation },
      { name: 'ppt/_rels/presentation.xml.rels', data: presentationRels },
      { name: 'ppt/slideMasters/slideMaster1.xml', data: master },
      { name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', data: `${XML_HEAD}<Relationships xmlns="${REL_NS}"><Relationship Id="rId1" Type="${OFFICE_REL}/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="${OFFICE_REL}/theme" Target="../theme/theme1.xml"/></Relationships>` },
      { name: 'ppt/slideLayouts/slideLayout1.xml', data: layout },
      { name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', data: `${XML_HEAD}<Relationships xmlns="${REL_NS}"><Relationship Id="rId1" Type="${OFFICE_REL}/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>` },
      { name: 'ppt/theme/theme1.xml', data: theme },
      ...files, ...media,
      { name: 'docProps/core.xml', data: `${XML_HEAD}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xml(title)}</dc:title><dc:creator>BesoinAvocat</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${stamp}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${stamp}</dcterms:modified></cp:coreProperties>` },
      { name: 'docProps/app.xml', data: `${XML_HEAD}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>BesoinAvocat</Application><Slides>${all.length}</Slides></Properties>` },
    ], when);
  }

  const MIME = {
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };
  // A file name the server accepts: no path or reserved characters, no trailing dot, at most 240 characters.
  function safeName(name, extension) {
    const base = String(name || '').normalize('NFC').replace(/[\\/:<>"|?*\u0000-\u001f\u007f]+/gu, ' ').replace(/\s+/gu, ' ').replace(/^[\s.-]+|[\s.]+$/gu, '').slice(0, 200) || 'Document';
    return extension && !base.toLowerCase().endsWith(`.${extension}`) ? `${base}.${extension}` : base;
  }
  function stampLabel(when = new Date()) {
    const pad = (value) => String(value).padStart(2, '0');
    return `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())} ${pad(when.getHours())} h ${pad(when.getMinutes())}`;
  }
  const internals = { crc32, zipStore, unzip, docxFromBlocks, blocksFromDocx, blocksText, pptxFromSlides, safeName, stampLabel, MIME };

  // ---------- Browser workspace ----------
  let bridge = null;
  const hasDom = typeof document !== 'undefined' && typeof document.createElement === 'function';
  const el = (tag, attrs = {}, children = []) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === false || value === null || value === undefined) continue;
      if (key === 'text') node.textContent = value;
      else if (key === 'html') node.innerHTML = value;
      else if (key === 'class') node.className = value;
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? '' : value);
    }
    for (const child of [].concat(children)) if (child !== null && child !== undefined && child !== false) node.append(child);
    return node;
  };
  const icon = (name) => bridge?.icon(name) || '';
  const button = (label, { cls = 'button secondary small', glyph = '', title = '', onclick, disabled = false, pressed } = {}) => el('button', {
    type: 'button', class: cls, title: title || false, 'aria-label': glyph && !label ? title : false, disabled,
    'aria-pressed': pressed === undefined ? false : String(pressed), onclick, html: `${glyph ? icon(glyph) : ''}${label ? `<span>${bridge.esc(label)}</span>` : ''}`,
  });
  const store = {
    get(key) { try { return window.localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { window.localStorage.setItem(key, value); } catch { /* private mode */ } },
  };
  const narrow = () => window.matchMedia?.('(max-width: 860px)').matches;

  // Viewer dock: one window at a time, in full screen, in one third of the screen, or in a corner.
  const MODES = [['full', 'full', 'Plein écran'], ['third', 'third', 'Un tiers de l’écran'], ['corner', 'corner', 'Petite fenêtre en coin']];
  const dock = { node: null, kind: null, cleanup: null, guard: null, returnFocus: null };
  function setMode(mode) {
    if (!dock.node) return;
    dock.node.dataset.mode = mode;
    document.body.classList.toggle('dock-third', mode === 'third');
    dock.node.querySelectorAll('[data-dock-mode]').forEach((node) => node.setAttribute('aria-pressed', String(node.dataset.dockMode === mode)));
    if (dock.kind) store.set(`ba.dock.${dock.kind}`, mode);
  }
  function closeDock(force = false) {
    if (!dock.node) return true;
    if (!force && dock.guard && !dock.guard()) return false;
    const cleanup = dock.cleanup;
    dock.cleanup = null; dock.guard = null;
    try { cleanup?.(); } catch { /* best effort: camera, object URLs */ }
    dock.node.remove(); dock.node = null; dock.kind = null;
    document.body.classList.remove('dock-third', 'dock-open');
    const back = dock.returnFocus; dock.returnFocus = null;
    if (back?.isConnected) back.focus({ preventScroll: true });
    return true;
  }
  function openDock({ title, kind, body, foot = null, defaultMode = 'third', cleanup = null, guard = null, label = '' }) {
    if (!closeDock()) return null;
    const dialog = document.getElementById('workspace-dialog');
    if (dialog?.open) dialog.close();
    dock.returnFocus = document.activeElement;
    const remembered = store.get(`ba.dock.${kind}`);
    const mode = narrow() && defaultMode === 'third' ? 'full' : MODES.some(([value]) => value === remembered) ? remembered : defaultMode;
    const heading = el('strong', { id: 'viewer-title', text: title });
    const modes = el('div', { class: 'viewer-modes', role: 'group', 'aria-label': 'Taille de la fenêtre' },
      MODES.map(([value, glyph, name]) => el('button', { type: 'button', class: 'icon-button', 'data-dock-mode': value, title: name, 'aria-label': name, 'aria-pressed': 'false', html: icon(glyph), onclick: () => setMode(value) })));
    const close = el('button', { type: 'button', class: 'icon-button', title: 'Fermer', 'aria-label': `Fermer ${label || title}`, html: icon('close'), onclick: () => closeDock() });
    dock.node = el('section', { class: 'viewer-dock', role: 'dialog', 'aria-labelledby': 'viewer-title', 'data-kind': kind }, [
      el('header', { class: 'viewer-head' }, [heading, modes, close]),
      el('div', { class: 'viewer-body' }, body), foot ? el('footer', { class: 'viewer-foot' }, foot) : null,
    ]);
    dock.kind = kind; dock.cleanup = cleanup; dock.guard = guard;
    document.body.append(dock.node);
    document.body.classList.add('dock-open');
    setMode(mode);
    close.focus({ preventScroll: true });
    return dock.node;
  }
  const dockBody = () => dock.node?.querySelector('.viewer-body');
  const dockFoot = () => dock.node?.querySelector('.viewer-foot');
  function setDockTitle(text) { const node = dock.node?.querySelector('#viewer-title'); if (node) node.textContent = text; }

  // Downloaded blobs are kept for a while (thumbnails, reopened files), within a memory budget.
  const blobCache = new Map(); let cachedBytes = 0;
  const CACHE_BUDGET = 96 * 1024 * 1024;
  function cachedBlob(doc) {
    const key = `${doc.id}:${doc.sha256 || doc.versionNumber || ''}`;
    if (blobCache.has(key)) { const hit = blobCache.get(key); blobCache.delete(key); blobCache.set(key, hit); return hit.promise; }
    const promise = bridge.fetchBlob(doc).then((blob) => {
      const entry = blobCache.get(key); if (entry) { entry.bytes = blob.size; cachedBytes += blob.size; }
      while (cachedBytes > CACHE_BUDGET && blobCache.size > 1) { const [oldest, value] = blobCache.entries().next().value; blobCache.delete(oldest); cachedBytes -= value.bytes || 0; }
      return blob;
    }, (error) => { blobCache.delete(key); throw error; });
    blobCache.set(key, { promise, bytes: 0 });
    return promise;
  }
  const thumbs = new Map();
  function reset() {
    closeDock(true);
    for (const url of thumbs.values()) URL.revokeObjectURL(url);
    thumbs.clear(); blobCache.clear(); cachedBytes = 0;
    document.body?.classList.remove('drawer-open');
  }
  const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const kindOf = (doc) => {
    const type = doc?.mimeType || '';
    if (IMAGE_TYPES.has(type)) return 'image';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/')) return 'audio';
    if (type === 'application/pdf') return 'pdf';
    if (type === MIME.docx) return 'docx';
    if (type === MIME.pptx) return 'pptx';
    if (['text/plain', 'text/csv', 'application/json', 'message/rfc822'].includes(type)) return 'text';
    return 'other';
  };
  // Thumbnails for images under 8 MB, two downloads at a time, only once per version.
  let thumbQueue = [], thumbActive = 0;
  function pumpThumbs() {
    while (thumbActive < 2 && thumbQueue.length) {
      const [doc, slot] = thumbQueue.shift();
      thumbActive += 1;
      cachedBlob(doc).then((blob) => {
        if (!thumbs.has(doc.id)) thumbs.set(doc.id, URL.createObjectURL(blob));
        paintThumb(slot, doc);
      }).catch(() => {}).finally(() => { thumbActive -= 1; pumpThumbs(); });
    }
  }
  function paintThumb(slot, doc) {
    if (!slot.isConnected || slot.querySelector('img')) return;
    const image = el('img', { alt: '', src: thumbs.get(doc.id), decoding: 'async' });
    slot.prepend(image);
    slot.classList.add('has-image');
  }
  function afterRender(root) {
    if (!bridge || bridge.isDemo()) return;
    const docs = bridge.docs();
    thumbQueue = [];
    root.querySelectorAll('[data-thumb]').forEach((slot) => {
      const doc = docs.find((item) => item.id === slot.dataset.thumb);
      if (!doc || kindOf(doc) !== 'image' || !(doc.bytes <= 8 * 1024 * 1024)) return;
      if (thumbs.has(doc.id)) paintThumb(slot, doc); else thumbQueue.push([doc, slot]);
    });
    thumbQueue = thumbQueue.slice(0, 36);
    pumpThumbs();
  }
  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const anchor = el('a', { href: url, download: name, rel: 'noopener' });
    document.body.append(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  async function startsWith(blob, signature) {
    const head = new Uint8Array(await blob.slice(0, 1024).arrayBuffer());
    const text = new TextDecoder('latin1').decode(head);
    return text.includes(signature);
  }
  function notice(text, extra = null) { return el('div', { class: 'viewer-empty' }, [el('p', { text }), extra]); }

  // ---------- Viewer ----------
  async function openFile(doc) {
    if (!bridge || !doc) return;
    const kind = kindOf(doc);
    const urls = [];
    const body = el('div', { class: 'viewer-loading', role: 'status', html: '<span class="loading-dot"></span>Ouverture de la pièce…' });
    const actions = [];
    const meta = el('small', { text: `${bridge.sourceLabel(doc.sourceType)} · version ${doc.versionNumber || 1}${doc.bytes ? ` · ${bridge.bytes(doc.bytes)}` : ''}` });
    let loaded = null;
    actions.push(button('Provenance', { glyph: 'info', onclick: () => { closeDock(true); bridge.provenance(doc.id); } }));
    if (kind === 'image') actions.push(button('Annoter', { glyph: 'pen', onclick: () => openStudio(doc) }));
    if (kind === 'docx' || kind === 'text') actions.push(button('Modifier', { glyph: 'edit', onclick: () => openEditor(doc) }));
    const save = button('Télécharger', { cls: 'button small', glyph: 'download', disabled: bridge.isDemo(), onclick: async () => { if (loaded) downloadBlob(loaded, doc.name); else bridge.download(doc.id, save); } });
    actions.push(save);
    if (!openDock({ title: doc.name, kind: kind === 'video' || kind === 'audio' ? 'media' : 'viewer', body, foot: [meta, ...actions], defaultMode: kind === 'video' ? 'third' : 'full', cleanup: () => urls.forEach((url) => URL.revokeObjectURL(url)) })) return;
    const node = dock.node;
    const show = (content) => { if (dock.node === node) dockBody().replaceChildren(content); };
    if (bridge.isDemo()) {
      show(doc.extractedText ? el('div', { class: 'viewer-text', text: doc.extractedText }) : notice('Aperçu fictif : aucun fichier réel n’est chargé.'));
      return;
    }
    try {
      const blob = await cachedBlob(doc);
      if (dock.node !== node) return;
      loaded = blob;
      const typed = blob.type === doc.mimeType ? blob : new Blob([blob], { type: doc.mimeType });
      const url = () => { const value = URL.createObjectURL(typed); urls.push(value); return value; };
      if (kind === 'image') show(el('img', { src: url(), alt: doc.name }));
      else if (kind === 'video') show(el('video', { src: url(), controls: true, playsinline: true, preload: 'metadata', 'aria-label': doc.name }));
      else if (kind === 'audio') show(el('div', { class: 'viewer-audio' }, [el('audio', { src: url(), controls: true, preload: 'metadata', 'aria-label': doc.name })]));
      else if (kind === 'pdf') {
        if (!await startsWith(blob, '%PDF-')) show(notice('Ce fichier ne commence pas comme un PDF. Téléchargez-le pour le contrôler.'));
        else show(el('iframe', { src: `${url()}#view=FitH`, title: `Aperçu de ${doc.name}` }));
      } else if (kind === 'text') {
        const text = await blob.slice(0, 2 * 1024 * 1024).text();
        show(el('div', { class: 'viewer-text', text: blob.size > 2 * 1024 * 1024 ? `${text}\n\n[Aperçu limité aux 2 premiers Mo. Téléchargez le fichier pour tout lire.]` : text }));
      } else if (kind === 'docx') {
        const blocks = await readDocx(blob);
        const page = el('article', { class: 'doc-page doc-readonly', 'aria-label': `Aperçu de ${doc.name}` });
        renderBlocks(page, blocks);
        show(el('div', { class: 'doc-stage' }, [page]));
      } else show(notice(kind === 'pptx' ? 'Les présentations s’ouvrent dans PowerPoint, Keynote ou LibreOffice. Téléchargez le fichier pour la projeter.' : 'Aucun aperçu pour ce format dans le navigateur. Téléchargez le fichier pour l’ouvrir.'));
    } catch (error) { show(notice(error.message || 'La pièce n’a pas pu être ouverte.')); }
  }
  async function readDocx(blob) {
    const entries = await unzip(new Uint8Array(await blob.arrayBuffer()), ['word/document.xml', 'word/numbering.xml']);
    const decoder = new TextDecoder();
    if (!entries.has('word/document.xml')) throw new Error('Ce document Word ne contient pas de texte lisible.');
    return blocksFromDocx(decoder.decode(entries.get('word/document.xml')), entries.has('word/numbering.xml') ? decoder.decode(entries.get('word/numbering.xml')) : null);
  }
  function inline(runs) {
    return runs.map((run) => {
      let node = document.createDocumentFragment();
      String(run.text).split('\n').forEach((piece, index) => { if (index) node.append(el('br')); if (piece) node.append(document.createTextNode(piece)); });
      for (const [flag, tag] of [['u', 'u'], ['i', 'i'], ['b', 'b']]) if (run[flag]) node = el(tag, {}, [node]);
      return node;
    });
  }
  function renderBlocks(page, blocks) {
    page.replaceChildren();
    let list = null, listKey = null;
    for (const block of blocks) {
      if (block.type === 'li') {
        const key = `${block.list}:${block.listId ?? ''}`;
        if (!list || listKey !== key) { list = el(block.list === 'number' ? 'ol' : 'ul'); listKey = key; page.append(list); }
        list.append(el('li', {}, inline(block.runs)));
        continue;
      }
      list = null; listKey = null;
      const node = el(block.type === 'h1' ? 'h1' : block.type === 'h2' ? 'h2' : 'p', {}, inline(block.runs));
      if (!block.runs.length) node.append(el('br'));
      page.append(node);
    }
  }
  // Editor DOM to blocks: paragraphs, two heading levels, lists, bold, italic, underline and line breaks.
  function blocksFromEditor(page) {
    const blocks = [];
    let listCounter = 0;
    const runsOf = (node, marks = {}) => {
      const runs = [];
      for (const child of node.childNodes) {
        if (child.nodeType === 3) { if (child.nodeValue) runs.push({ text: child.nodeValue.replace(/ /gu, ' '), ...marks }); continue; }
        if (child.nodeType !== 1) continue;
        const tag = child.tagName;
        if (tag === 'BR') { runs.push({ text: '\n', ...marks }); continue; }
        const next = { ...marks };
        if (tag === 'B' || tag === 'STRONG' || Number(child.style?.fontWeight) >= 600 || child.style?.fontWeight === 'bold') next.b = true;
        if (tag === 'I' || tag === 'EM' || child.style?.fontStyle === 'italic') next.i = true;
        if (tag === 'U' || child.style?.textDecorationLine?.includes('underline')) next.u = true;
        if (['P', 'DIV', 'H1', 'H2', 'H3', 'UL', 'OL', 'LI'].includes(tag)) { runs.push(...runsOf(child, next), { text: '\n', ...marks }); continue; }
        runs.push(...runsOf(child, next));
      }
      return runs;
    };
    const trim = (runs) => { while (runs.length && runs.at(-1).text === '\n') runs.pop(); return runs; };
    for (const child of page.childNodes) {
      if (child.nodeType === 3) { if (child.nodeValue.trim()) blocks.push({ type: 'p', runs: [{ text: child.nodeValue }] }); continue; }
      if (child.nodeType !== 1) continue;
      const tag = child.tagName;
      if (tag === 'UL' || tag === 'OL') {
        listCounter += 1;
        for (const item of child.children) if (item.tagName === 'LI') blocks.push({ type: 'li', list: tag === 'OL' ? 'number' : 'bullet', listId: String(listCounter), runs: trim(runsOf(item)) });
      } else if (tag === 'H1') blocks.push({ type: 'h1', runs: trim(runsOf(child)) });
      else if (/^H[2-6]$/u.test(tag)) blocks.push({ type: 'h2', runs: trim(runsOf(child)) });
      else if (tag === 'BR') blocks.push({ type: 'p', runs: [] });
      else blocks.push({ type: 'p', runs: trim(runsOf(child)) });
    }
    while (blocks.length && !blocks.at(-1).runs.some((run) => run.text.trim())) blocks.pop();
    return blocks;
  }

  // ---------- Document editor ----------
  async function openEditor(source = null) {
    if (!bridge) return;
    let dirty = false, savedId = source && kindOf(source) === 'docx' ? source.id : null, versionOf = source?.id || null;
    const baseTitle = source ? source.name.replace(/\.(docx|txt|csv|json|eml)$/iu, '') : 'Document sans titre';
    const titleInput = el('input', { class: 'doc-title', type: 'text', value: baseTitle, maxlength: '180', 'aria-label': 'Titre du document', oninput: () => { dirty = true; } });
    const page = el('div', { class: 'doc-page', contenteditable: 'true', role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Texte du document', spellcheck: 'true', lang: 'fr-CA', 'data-placeholder': 'Commencez à écrire. Décrivez les faits dans l’ordre, avec les dates et les pièces qui s’y rapportent.' });
    const status = el('div', { class: 'doc-status', role: 'status', text: source ? 'Ouverture du document…' : 'Nouveau document · rien n’est enregistré tant que vous ne cliquez pas « Enregistrer ».' });
    const command = (name, value = null) => { page.focus(); document.execCommand(name, false, value); dirty = true; refreshState(); };
    const format = el('select', { 'aria-label': 'Style du paragraphe', onchange: (event) => command('formatBlock', event.target.value) }, [
      el('option', { value: 'p', text: 'Paragraphe' }), el('option', { value: 'h1', text: 'Titre 1' }), el('option', { value: 'h2', text: 'Titre 2' }),
    ]);
    const tool = (label, name, title, cls = '') => el('button', { type: 'button', class: `tool ${cls}`, title, 'aria-label': title, 'aria-pressed': 'false', 'data-command': name, html: label, onmousedown: (event) => event.preventDefault(), onclick: () => command(name) });
    const toolbar = el('div', { class: 'doc-toolbar', role: 'toolbar', 'aria-label': 'Mise en forme' }, [
      titleInput, el('span', { class: 'sep' }), format,
      tool('<b>G</b>', 'bold', 'Gras (Ctrl+B)'), tool('<i>I</i>', 'italic', 'Italique (Ctrl+I)'), tool('<u>S</u>', 'underline', 'Souligné (Ctrl+U)'),
      el('span', { class: 'sep' }), tool(icon('listBullet'), 'insertUnorderedList', 'Liste à puces'), tool(icon('listNumber'), 'insertOrderedList', 'Liste numérotée'),
      el('span', { class: 'sep' }), tool(icon('undo'), 'undo', 'Annuler (Ctrl+Z)'), tool(icon('redo'), 'redo', 'Rétablir'),
    ]);
    const refreshState = () => {
      toolbar.querySelectorAll('[data-command]').forEach((node) => {
        if (['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList'].includes(node.dataset.command)) {
          let active = false; try { active = document.queryCommandState(node.dataset.command); } catch { /* unsupported */ }
          node.setAttribute('aria-pressed', String(Boolean(active)));
        }
      });
      let block = ''; try { block = String(document.queryCommandValue('formatBlock') || '').toLowerCase(); } catch { /* unsupported */ }
      format.value = ['h1', 'h2'].includes(block) ? block : 'p';
      const words = (page.innerText || '').trim().split(/\s+/u).filter(Boolean).length;
      if (!status.dataset.locked) status.textContent = `${words} mot${words > 1 ? 's' : ''}${dirty ? ' · modifications non enregistrées' : savedId ? ' · enregistré dans le dossier' : ''}`;
    };
    page.addEventListener('input', () => { dirty = true; refreshState(); });
    page.addEventListener('keyup', refreshState); page.addEventListener('mouseup', refreshState);
    // Pasted content keeps its text only: no foreign styles, images or links enter the document.
    page.addEventListener('paste', (event) => { event.preventDefault(); const text = event.clipboardData?.getData('text/plain') || ''; document.execCommand('insertText', false, text); });
    page.addEventListener('drop', (event) => event.preventDefault());
    const saveButton = button(bridge.canSave() ? 'Enregistrer dans le dossier' : 'Enregistrement indisponible', { cls: 'button small', glyph: 'check', disabled: !bridge.canSave() });
    const exportButton = button('Télécharger .docx', { glyph: 'download' });
    const build = () => {
      const blocks = blocksFromEditor(page);
      const title = titleInput.value.trim() || 'Document sans titre';
      return { blocks, title, bytes: docxFromBlocks(blocks, { title }), text: blocksText(blocks) };
    };
    exportButton.addEventListener('click', () => { const { bytes, title } = build(); downloadBlob(new Blob([bytes], { type: MIME.docx }), safeName(title, 'docx')); });
    saveButton.addEventListener('click', async () => {
      const { bytes, title, text, blocks } = build();
      if (!blocks.length) { bridge.notify('Le document est vide.', true); return; }
      saveButton.disabled = true; status.dataset.locked = '1'; status.textContent = 'Enregistrement dans le dossier…';
      try {
        const created = await bridge.save(new Blob([bytes], { type: MIME.docx }), {
          name: safeName(title, 'docx'), mimeType: MIME.docx, sourceType: 'declaration', extractedText: text.slice(0, 200000), versionOf,
          sourceReference: versionOf ? `Nouvelle version rédigée dans l’éditeur du portail le ${stampLabel()}. La version précédente reste au dossier.` : `Document rédigé dans l’éditeur du portail le ${stampLabel()}.`,
        });
        dirty = false; savedId = created?.id || savedId; versionOf = savedId;
        delete status.dataset.locked;
        status.textContent = `Enregistré dans le dossier · version ${created?.versionNumber || 1} · ${stampLabel()}`;
        bridge.notify('Le document est enregistré dans le dossier. Son contenu reste à vérifier.');
      } catch (error) { delete status.dataset.locked; status.textContent = error.message; bridge.notify(error.message, true); }
      finally { saveButton.disabled = !bridge.canSave(); }
    });
    const editor = el('div', { class: 'doc-editor' }, [toolbar, el('div', { class: 'doc-stage' }, [page]), status]);
    const opened = openDock({ title: source ? `Modifier — ${source.name}` : 'Nouveau document', kind: 'editor', body: editor, defaultMode: 'full', label: 'l’éditeur',
      foot: [el('small', { text: bridge.isDemo() ? 'Aperçu : rien n’est envoyé au serveur.' : 'Enregistré au format Word (.docx). L’original éventuel reste inchangé au dossier.' }), exportButton, saveButton],
      guard: () => !dirty || window.confirm('Fermer sans enregistrer les modifications ?') });
    if (!opened) return;
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); document.execCommand('styleWithCSS', false, false); } catch { /* older engines */ }
    if (source) {
      try {
        if (bridge.isDemo()) renderBlocks(page, String(source.extractedText || '').split('\n').map((line) => ({ type: 'p', runs: line ? [{ text: line }] : [] })));
        else {
          const blob = await cachedBlob(source);
          const blocks = kindOf(source) === 'docx' ? await readDocx(blob) : (await blob.slice(0, 2 * 1024 * 1024).text()).split(/\r?\n/u).map((line) => ({ type: 'p', runs: line ? [{ text: line }] : [] }));
          renderBlocks(page, blocks);
        }
        refreshState();
      } catch (error) { status.textContent = error.message; }
    } else { page.append(el('p', {}, [el('br')])); refreshState(); }
    page.focus();
  }

  // ---------- Drawing board and image editor ----------
  const COLORS = [['#8b2132', 'Bordeaux'], ['#d23a2a', 'Rouge'], ['#e0a100', 'Jaune'], ['#1f7a4c', 'Vert'], ['#2f5fa7', 'Bleu'], ['#13233a', 'Marine'], ['#ffffff', 'Blanc']];
  const TOOLS = [['pen', 'pen', 'Crayon'], ['highlight', 'highlighter', 'Surligneur'], ['eraser', 'eraser', 'Gomme'], ['line', 'line', 'Ligne'], ['arrow', 'arrowTool', 'Flèche'], ['rect', 'rect', 'Cadre'], ['text', 'text', 'Texte'], ['marker', 'marker', 'Repère numéroté'], ['mask', 'mask', 'Masquer une zone (flou)'], ['crop', 'crop', 'Recadrer']];
  function makeCanvas(width, height) { const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(width)); canvas.height = Math.max(1, Math.round(height)); return canvas; }
  function adjust(base, brightness, contrast) {
    if (!brightness && !contrast) return base;
    const out = makeCanvas(base.width, base.height), ctx = out.getContext('2d');
    ctx.drawImage(base, 0, 0);
    const image = ctx.getImageData(0, 0, out.width, out.height), data = image.data;
    const factor = 1 + contrast / 100, shift = brightness * 2.55;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = (data[i] - 128) * factor + 128 + shift;
      data[i + 1] = (data[i + 1] - 128) * factor + 128 + shift;
      data[i + 2] = (data[i + 2] - 128) * factor + 128 + shift;
    }
    ctx.putImageData(image, 0, 0);
    return out;
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  const normRect = (a, b) => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) });
  function wrapLines(ctx, text, width) {
    const words = String(text).split(/\s+/u), lines = [];
    let line = '';
    for (const word of words) { const next = line ? `${line} ${word}` : word; if (ctx.measureText(next).width > width && line) { lines.push(line); line = word; } else line = next; }
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }
  async function loadImage(blob) {
    if (typeof createImageBitmap === 'function') { try { return await createImageBitmap(blob); } catch { /* fall back to <img> */ } }
    const url = URL.createObjectURL(blob);
    try {
      return await new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('Image illisible dans ce navigateur.')); image.src = url; });
    } finally { window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }
  async function openStudio(source = null) {
    if (!bridge) return;
    const S = { base: null, adjusted: null, ops: [], undo: [], redo: [], tool: source ? 'marker' : 'pen', color: COLORS[0][0], size: 4, brightness: 0, contrast: 0, draft: null, crop: null, legend: true, savedId: null, dirty: false };
    const canvas = makeCanvas(1600, 1000), ctx = canvas.getContext('2d');
    canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', source ? `Annotation de ${source.name}` : 'Tableau à dessin');
    const overlay = makeCanvas(1600, 1000);
    const legendList = el('ol', { class: 'studio-legend-list' });
    const legendBox = el('section', { class: 'studio-legend', 'aria-label': 'Légende des repères', hidden: true }, [
      el('div', { class: 'studio-legend-head' }, [el('strong', { text: 'Légende des repères' }),
        el('label', { class: 'checkbox-filter' }, [el('input', { type: 'checkbox', checked: true, onchange: (event) => { S.legend = event.target.checked; } }), ' Ajouter la légende sous l’image']),
      ]), legendList,
    ]);
    const markers = () => S.ops.filter((op) => op.type === 'marker');
    const snapshot = () => ({ base: S.base, ops: structuredClone(S.ops) });
    const commit = () => { S.undo.push(snapshot()); if (S.undo.length > 40) S.undo.shift(); S.redo = []; S.dirty = true; };
    const scale = () => Math.max(1, Math.max(S.base.width, S.base.height) / 1200);
    function drawOp(target, op) {
      target.save();
      target.lineCap = 'round'; target.lineJoin = 'round';
      target.strokeStyle = op.color; target.fillStyle = op.color; target.lineWidth = op.size;
      if (op.type === 'pen' || op.type === 'highlight' || op.type === 'eraser') {
        if (op.type === 'highlight') { target.globalAlpha = 0.35; target.lineCap = 'square'; }
        if (op.type === 'eraser') target.globalCompositeOperation = 'destination-out';
        target.beginPath();
        op.points.forEach((point, index) => (index ? target.lineTo(point.x, point.y) : target.moveTo(point.x, point.y)));
        if (op.points.length === 1) target.lineTo(op.points[0].x + 0.1, op.points[0].y);
        target.stroke();
      } else if (op.type === 'line' || op.type === 'arrow') {
        target.beginPath(); target.moveTo(op.a.x, op.a.y); target.lineTo(op.b.x, op.b.y); target.stroke();
        if (op.type === 'arrow') {
          const angle = Math.atan2(op.b.y - op.a.y, op.b.x - op.a.x), head = Math.max(12, op.size * 4);
          target.beginPath(); target.moveTo(op.b.x, op.b.y);
          target.lineTo(op.b.x - head * Math.cos(angle - 0.45), op.b.y - head * Math.sin(angle - 0.45));
          target.lineTo(op.b.x - head * Math.cos(angle + 0.45), op.b.y - head * Math.sin(angle + 0.45));
          target.closePath(); target.fill();
        }
      } else if (op.type === 'rect') {
        const r = normRect(op.a, op.b); target.strokeRect(r.x, r.y, r.w, r.h);
      } else if (op.type === 'text') {
        const size = Math.max(14, op.size * 5);
        target.font = `600 ${size}px Inter, Arial, sans-serif`; target.textBaseline = 'top';
        target.lineWidth = Math.max(3, size / 6); target.strokeStyle = op.color === '#ffffff' ? '#0f1b2d' : '#ffffff';
        String(op.text).split('\n').forEach((line, index) => { target.strokeText(line, op.at.x, op.at.y + index * size * 1.25); target.fillText(line, op.at.x, op.at.y + index * size * 1.25); });
      } else if (op.type === 'marker') {
        const s = 34 * op.scale, x = op.at.x - s / 2, y = op.at.y - s / 2;
        target.shadowColor = 'rgba(9,18,33,.35)'; target.shadowBlur = 6 * op.scale; target.shadowOffsetY = 2 * op.scale;
        roundRect(target, x, y, s, s, 6 * op.scale); target.fillStyle = op.color === '#ffffff' ? '#13233a' : op.color; target.fill();
        target.shadowColor = 'transparent'; target.lineWidth = 2 * op.scale; target.strokeStyle = '#ffffff'; target.stroke();
        target.fillStyle = '#ffffff'; target.font = `700 ${18 * op.scale}px Inter, Arial, sans-serif`; target.textAlign = 'center'; target.textBaseline = 'middle';
        target.fillText(String(op.n), op.at.x, op.at.y + op.scale);
      }
      target.restore();
    }
    function drawMask(target, op) {
      const r = normRect(op.a, op.b);
      if (r.w < 2 || r.h < 2) return;
      const cell = Math.max(6, Math.round(Math.min(r.w, r.h) / 10));
      const small = makeCanvas(Math.max(1, r.w / cell), Math.max(1, r.h / cell)), sctx = small.getContext('2d');
      sctx.drawImage(S.adjusted, r.x, r.y, r.w, r.h, 0, 0, small.width, small.height);
      target.save(); target.imageSmoothingEnabled = false; target.drawImage(small, 0, 0, small.width, small.height, r.x, r.y, r.w, r.h); target.restore();
    }
    function render(forExport = false) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(S.adjusted, 0, 0);
      const all = S.draft ? [...S.ops, S.draft] : S.ops;
      for (const op of all) if (op.type === 'mask') drawMask(ctx, op);
      const octx = overlay.getContext('2d');
      octx.clearRect(0, 0, overlay.width, overlay.height);
      for (const op of all) if (op.type !== 'mask' && op.type !== 'crop') drawOp(octx, op);
      ctx.drawImage(overlay, 0, 0);
      if (!forExport) {
        for (const op of all) if (op.type === 'mask' && op === S.draft) { const r = normRect(op.a, op.b); ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = '#13233a'; ctx.lineWidth = 2 * scale(); ctx.strokeRect(r.x, r.y, r.w, r.h); ctx.restore(); }
        if (S.crop) {
          const r = normRect(S.crop.a, S.crop.b);
          ctx.save(); ctx.fillStyle = 'rgba(9,18,33,.5)';
          ctx.fillRect(0, 0, canvas.width, r.y); ctx.fillRect(0, r.y + r.h, canvas.width, canvas.height - r.y - r.h);
          ctx.fillRect(0, r.y, r.x, r.h); ctx.fillRect(r.x + r.w, r.y, canvas.width - r.x - r.w, r.h);
          ctx.setLineDash([10, 6]); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2 * scale(); ctx.strokeRect(r.x, r.y, r.w, r.h); ctx.restore();
        }
      }
    }
    function setBase(next) {
      S.base = next; S.adjusted = adjust(next, S.brightness, S.contrast);
      for (const target of [canvas, overlay]) { target.width = next.width; target.height = next.height; }
      render();
    }
    function refreshLegend() {
      const list = markers();
      legendBox.hidden = list.length === 0;
      legendList.replaceChildren(...list.map((op) => el('li', {}, [
        el('span', { class: 'studio-pin', text: String(op.n), 'aria-hidden': 'true' }),
        el('input', { type: 'text', value: op.label || '', maxlength: '160', placeholder: `Ce que montre le repère ${op.n} (ex. « J’étais ici »)`, 'aria-label': `Libellé du repère ${op.n}`,
          oninput: (event) => { op.label = event.target.value; S.dirty = true; } }),
      ])));
    }
    const point = (event) => {
      const rect = canvas.getBoundingClientRect();
      return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
    };
    let pointerId = null;
    canvas.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || !S.base) return;
      const at = point(event), size = S.size * scale();
      if (S.tool === 'text') { askText(at); return; }
      if (S.tool === 'marker') {
        commit();
        const n = markers().reduce((max, op) => Math.max(max, op.n), 0) + 1;
        S.ops.push({ type: 'marker', at, n, color: S.color, scale: scale(), label: '' });
        render(); refreshLegend();
        legendList.querySelector(`li:last-child input`)?.focus({ preventScroll: true });
        return;
      }
      pointerId = event.pointerId; canvas.setPointerCapture(pointerId);
      if (S.tool === 'crop') { S.crop = { a: at, b: at }; cropBar.hidden = true; render(); return; }
      const color = S.tool === 'eraser' ? '#000000' : S.color;
      const width = S.tool === 'highlight' ? size * 4 : S.tool === 'eraser' ? size * 4 : size;
      S.draft = ['pen', 'highlight', 'eraser'].includes(S.tool) ? { type: S.tool, color, size: width, points: [at] } : { type: S.tool, color, size: width, a: at, b: at };
      render();
    });
    canvas.addEventListener('pointermove', (event) => {
      if (event.pointerId !== pointerId) return;
      const at = point(event);
      if (S.tool === 'crop' && S.crop) { S.crop.b = at; render(); return; }
      if (!S.draft) return;
      if (S.draft.points) S.draft.points.push(at); else S.draft.b = at;
      render();
    });
    const finish = (event) => {
      if (event.pointerId !== pointerId) return;
      pointerId = null;
      if (S.tool === 'crop' && S.crop) { const r = normRect(S.crop.a, S.crop.b); cropBar.hidden = r.w < 8 || r.h < 8; if (cropBar.hidden) S.crop = null; render(); return; }
      if (!S.draft) return;
      const draft = S.draft; S.draft = null;
      const tiny = draft.a && Math.hypot(draft.b.x - draft.a.x, draft.b.y - draft.a.y) < 3;
      if (!tiny) { commit(); S.ops.push(draft); }
      render();
    };
    canvas.addEventListener('pointerup', finish); canvas.addEventListener('pointercancel', finish);
    const stage = el('div', { class: 'studio-stage' }, [canvas]);
    function askText(at) {
      const rect = canvas.getBoundingClientRect(), host = stage.getBoundingClientRect();
      const input = el('input', { type: 'text', class: 'studio-text-input', maxlength: '200', 'aria-label': 'Texte à placer sur l’image', placeholder: 'Votre texte, puis Entrée' });
      input.style.left = `${rect.left - host.left + stage.scrollLeft + at.x * rect.width / canvas.width}px`;
      input.style.top = `${rect.top - host.top + stage.scrollTop + at.y * rect.height / canvas.height}px`;
      const done = (keep) => {
        if (!input.isConnected) return;
        const value = input.value.trim(); input.remove();
        if (keep && value) { commit(); S.ops.push({ type: 'text', at, text: value, color: S.color, size: S.size * scale() }); render(); }
      };
      input.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); done(true); } if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); done(false); } });
      input.addEventListener('blur', () => done(true));
      stage.append(input); input.focus();
    }
    function transformOps(map) {
      for (const op of S.ops) {
        if (op.points) op.points = op.points.map(map);
        if (op.a) { op.a = map(op.a); op.b = map(op.b); }
        if (op.at) op.at = map(op.at);
      }
    }
    function rotate() {
      if (!S.base) return;
      commit();
      const old = S.base, next = makeCanvas(old.height, old.width), nctx = next.getContext('2d');
      nctx.translate(next.width, 0); nctx.rotate(Math.PI / 2); nctx.drawImage(old, 0, 0);
      transformOps((p) => ({ x: old.height - p.y, y: p.x }));
      setBase(next);
    }
    function applyCrop() {
      if (!S.crop) return;
      const r = normRect(S.crop.a, S.crop.b);
      const x = Math.max(0, Math.round(r.x)), y = Math.max(0, Math.round(r.y));
      const w = Math.min(S.base.width - x, Math.round(r.w)), h = Math.min(S.base.height - y, Math.round(r.h));
      S.crop = null; cropBar.hidden = true;
      if (w < 8 || h < 8) { render(); return; }
      commit();
      const next = makeCanvas(w, h); next.getContext('2d').drawImage(S.base, x, y, w, h, 0, 0, w, h);
      transformOps((p) => ({ x: p.x - x, y: p.y - y }));
      setBase(next);
    }
    function step(from, to) {
      if (!from.length) return;
      to.push(snapshot());
      const previous = from.pop();
      S.ops = previous.ops;
      if (previous.base !== S.base) setBase(previous.base); else render();
      refreshLegend(); S.dirty = true;
    }
    const cropBar = el('div', { class: 'studio-cropbar', hidden: true }, [
      el('span', { text: 'Recadrage prêt' }),
      button('Appliquer', { cls: 'button small', glyph: 'check', onclick: applyCrop }),
      button('Annuler', { onclick: () => { S.crop = null; cropBar.hidden = true; render(); } }),
    ]);
    const toolButtons = TOOLS.map(([id, glyph, name]) => el('button', { type: 'button', class: 'tool', title: name, 'aria-label': name, 'aria-pressed': String(S.tool === id), 'data-tool': id, html: icon(glyph),
      onclick: () => { S.tool = id; if (id !== 'crop') { S.crop = null; cropBar.hidden = true; render(); } toolButtons.forEach((node) => node.setAttribute('aria-pressed', String(node.dataset.tool === id))); } }));
    const swatches = COLORS.map(([value, name]) => {
      const node = el('button', { type: 'button', class: 'swatch', title: name, 'aria-label': `Couleur ${name}`, 'aria-pressed': String(S.color === value),
        onclick: () => { S.color = value; swatches.forEach((item) => item.setAttribute('aria-pressed', String(item === node))); } });
      node.style.background = value;
      return node;
    });
    const range = (label, min, max, value, oninput, onchange) => el('label', { class: 'studio-range' }, [label, el('input', { type: 'range', min, max, value, oninput, onchange })]);
    let adjustFrame = 0;
    const scheduleAdjust = () => { cancelAnimationFrame(adjustFrame); adjustFrame = requestAnimationFrame(() => { S.adjusted = adjust(S.base, S.brightness, S.contrast); render(); }); };
    const adjusters = source ? [el('span', { class: 'sep' }),
      range('Luminosité', -60, 60, 0, (event) => { S.brightness = Number(event.target.value); scheduleAdjust(); }, () => { S.dirty = true; }),
      range('Contraste', -60, 60, 0, (event) => { S.contrast = Number(event.target.value); scheduleAdjust(); }, () => { S.dirty = true; })] : [];
    const ai = el('button', { type: 'button', class: 'tool tool-ai', disabled: true, title: 'Libellés proposés par l’IA : à connecter, facturés à l’heure. Aucun envoi aujourd’hui.', 'aria-label': 'Libellés par IA, à connecter', html: `${icon('spark')}<span>IA · à connecter</span>` });
    const toolbar = el('div', { class: 'studio-toolbar', role: 'toolbar', 'aria-label': 'Outils de dessin' }, [
      ...toolButtons, el('span', { class: 'sep' }), ...swatches, el('span', { class: 'sep' }),
      range('Épaisseur', 1, 16, S.size, (event) => { S.size = Number(event.target.value); }),
      el('span', { class: 'sep' }),
      el('button', { type: 'button', class: 'tool', title: 'Pivoter de 90°', 'aria-label': 'Pivoter de 90°', html: icon('rotate'), onclick: rotate }),
      el('button', { type: 'button', class: 'tool', title: 'Annuler', 'aria-label': 'Annuler', html: icon('undo'), onclick: () => step(S.undo, S.redo) }),
      el('button', { type: 'button', class: 'tool', title: 'Rétablir', 'aria-label': 'Rétablir', html: icon('redo'), onclick: () => step(S.redo, S.undo) }),
      ...adjusters, el('span', { class: 'sep' }), ai,
    ]);
    const studio = el('div', { class: 'studio' }, [toolbar, cropBar, stage, legendBox]);
    const saveButton = button(bridge.canSave() ? 'Enregistrer dans le dossier' : 'Enregistrement indisponible', { cls: 'button small', glyph: 'check', disabled: !bridge.canSave() });
    const exportButton = button('Télécharger l’image', { glyph: 'download' });
    const exportCanvas = () => {
      render(true);
      const list = markers();
      if (!S.legend || !list.length) { const copy = makeCanvas(canvas.width, canvas.height); copy.getContext('2d').drawImage(canvas, 0, 0); render(); return copy; }
      const size = Math.max(16, Math.round(canvas.width / 70)), pad = Math.round(size * 1.2), measure = makeCanvas(10, 10).getContext('2d');
      measure.font = `500 ${size}px Inter, Arial, sans-serif`;
      const rows = list.map((op) => ({ op, lines: wrapLines(measure, op.label?.trim() || 'Sans libellé', canvas.width - pad * 2 - size * 2.6) }));
      const height = pad * 2 + size * 1.6 + rows.reduce((sum, row) => sum + row.lines.length * size * 1.4 + size * 0.5, 0);
      const out = makeCanvas(canvas.width, canvas.height + height), octx = out.getContext('2d');
      octx.fillStyle = '#ffffff'; octx.fillRect(0, 0, out.width, out.height);
      octx.drawImage(canvas, 0, 0);
      octx.fillStyle = '#e2e6ed'; octx.fillRect(0, canvas.height, out.width, Math.max(1, size / 12));
      let y = canvas.height + pad;
      octx.fillStyle = '#0f1b2d'; octx.font = `700 ${size}px Inter, Arial, sans-serif`; octx.textBaseline = 'top';
      octx.fillText('Légende', pad, y); y += size * 1.6;
      for (const row of rows) {
        const s = size * 1.5;
        roundRect(octx, pad, y - size * 0.15, s, s, size / 4); octx.fillStyle = row.op.color === '#ffffff' ? '#13233a' : row.op.color; octx.fill();
        octx.fillStyle = '#ffffff'; octx.font = `700 ${size * 0.85}px Inter, Arial, sans-serif`; octx.textAlign = 'center'; octx.textBaseline = 'middle';
        octx.fillText(String(row.op.n), pad + s / 2, y - size * 0.15 + s / 2);
        octx.textAlign = 'left'; octx.textBaseline = 'top'; octx.fillStyle = '#26344a'; octx.font = `500 ${size}px Inter, Arial, sans-serif`;
        row.lines.forEach((line, index) => octx.fillText(line, pad + s + size * 0.7, y + index * size * 1.4));
        y += row.lines.length * size * 1.4 + size * 0.5;
      }
      render();
      return out;
    };
    const encode = (target) => new Promise((resolve, reject) => {
      const type = source ? 'image/jpeg' : 'image/png';
      target.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('L’image n’a pas pu être produite.'))), type, 0.92);
    });
    const baseName = source ? `Annotation — ${source.name.replace(/\.[a-z0-9]{2,5}$/iu, '')}` : `Dessin — ${stampLabel()}`;
    const extension = source ? 'jpg' : 'png';
    exportButton.addEventListener('click', async () => downloadBlob(await encode(exportCanvas()), safeName(baseName, extension)));
    saveButton.addEventListener('click', async () => {
      saveButton.disabled = true;
      try {
        const blob = await encode(exportCanvas());
        const legend = markers().map((op) => `${op.n} — ${op.label?.trim() || 'sans libellé'}`);
        const created = await bridge.save(blob, {
          name: safeName(baseName, extension), mimeType: source ? 'image/jpeg' : 'image/png', sourceType: 'analyse', versionOf: S.savedId,
          sourceReference: (source ? `Annotation faite dans le portail le ${stampLabel()} sur « ${source.name} ». La pièce d’origine reste au dossier sans modification.` : `Dessin fait dans le portail le ${stampLabel()}.`).slice(0, 2048),
          extractedText: legend.length ? `Légende des repères :\n${legend.join('\n')}` : '',
        });
        S.savedId = created?.id || S.savedId; S.dirty = false;
        bridge.notify(source ? 'L’annotation est enregistrée comme nouvelle pièce. L’original reste inchangé.' : 'Le dessin est enregistré dans le dossier.');
      } catch (error) { bridge.notify(error.message, true); }
      finally { saveButton.disabled = !bridge.canSave(); }
    });
    const onKey = (event) => {
      if (!dock.node?.contains(event.target) && event.target !== document.body) return;
      if (event.target.closest?.('input, textarea')) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); step(event.shiftKey ? S.redo : S.undo, event.shiftKey ? S.undo : S.redo); }
      if (event.key === 'Enter' && S.crop) { event.preventDefault(); applyCrop(); }
    };
    document.addEventListener('keydown', onKey);
    const opened = openDock({ title: source ? `Annoter — ${source.name}` : 'Tableau à dessin', kind: 'studio', body: studio, defaultMode: 'full', label: 'le tableau à dessin',
      foot: [el('small', { text: bridge.isDemo() ? 'Aperçu : rien n’est envoyé au serveur.' : source ? 'L’annotation devient une nouvelle pièce « Analyse ». L’original reste inchangé.' : 'Le dessin devient une pièce « Analyse » du dossier.' }), exportButton, saveButton],
      cleanup: () => document.removeEventListener('keydown', onKey),
      guard: () => !S.dirty || window.confirm('Fermer sans enregistrer le dessin ?') });
    if (!opened) return;
    if (source && !bridge.isDemo()) {
      try {
        const image = await loadImage(await cachedBlob(source));
        const ratio = Math.min(1, 2400 / Math.max(image.width, image.height));
        const base = makeCanvas(image.width * ratio, image.height * ratio);
        base.getContext('2d').drawImage(image, 0, 0, base.width, base.height);
        image.close?.();
        setBase(base);
      } catch (error) { bridge.notify(error.message || 'Image illisible.', true); closeDock(true); }
    } else {
      const base = makeCanvas(1600, 1000), bctx = base.getContext('2d');
      bctx.fillStyle = '#ffffff'; bctx.fillRect(0, 0, base.width, base.height);
      setBase(base);
    }
  }

  // ---------- Video and voice messages ----------
  const RECORDING_LIMIT = 5 * 60;
  function pickType(audioOnly) {
    const candidates = audioOnly ? ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'] : ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
    return candidates.find((type) => window.MediaRecorder?.isTypeSupported?.(type)) || '';
  }
  function recordVideo() {
    if (!bridge) return;
    let stream = null, recorder = null, chunks = [], timer = 0, cap = 0, recorded = null, reviewUrl = null, startedAt = 0;
    const supported = Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
    const video = el('video', { playsinline: true, muted: true, autoplay: true, hidden: true, 'aria-label': 'Aperçu de la caméra' });
    const state = el('p', { class: 'rec-state', role: 'status' }, [el('span', { class: 'rec-dot', 'aria-hidden': 'true' }), el('span', { text: 'Caméra éteinte' })]);
    const setState = (text, live = false) => { state.classList.toggle('live', live); state.lastChild.textContent = text; };
    const subject = el('input', { type: 'text', maxlength: '120', placeholder: 'Objet du message (facultatif)', 'aria-label': 'Objet du message' });
    const audioOnly = el('input', { type: 'checkbox', id: 'rec-audio-only' });
    const intro = el('div', { class: 'recorder-intro' }, [
      el('p', { text: supported ? 'Expliquez votre situation à votre avocat, en vidéo ou en message vocal, jusqu’à 5 minutes. La caméra et le micro s’allument seulement après votre clic.' : 'Ce navigateur ne permet pas d’enregistrer ici. Enregistrez une vidéo avec votre téléphone, puis versez-la dans Pièces et sources.' }),
      supported ? el('label', { class: 'checkbox-filter', for: 'rec-audio-only' }, [audioOnly, ' Message vocal seulement (sans caméra)']) : null,
    ]);
    const enable = button('Activer la caméra et le micro', { cls: 'button small', glyph: 'video', disabled: !supported });
    const startButton = button('Démarrer l’enregistrement', { cls: 'button wine small', glyph: 'record', disabled: true, onclick: () => start() });
    const stopButton = button('Arrêter', { cls: 'button small', glyph: 'stop', onclick: () => stop() });
    const again = button('Recommencer', { glyph: 'undo', onclick: () => { recorded = null; if (reviewUrl) URL.revokeObjectURL(reviewUrl); reviewUrl = null; video.removeAttribute('src'); video.controls = false; video.muted = true; video.srcObject = stream; layout('ready'); } });
    const send = button(bridge.canSave() ? 'Envoyer au dossier' : 'Envoi indisponible', { cls: 'button call small', glyph: 'send', disabled: !bridge.canSave() });
    audioOnly.addEventListener('change', () => { enable.querySelector('span').textContent = audioOnly.checked ? 'Activer le micro' : 'Activer la caméra et le micro'; });
    const controls = el('div', { class: 'recorder-controls' }, [enable, startButton, stopButton, again, send]);
    const layout = (phase) => {
      enable.hidden = phase !== 'idle'; startButton.hidden = phase !== 'ready'; startButton.disabled = phase !== 'ready';
      stopButton.hidden = phase !== 'recording'; again.hidden = phase !== 'review'; send.hidden = phase !== 'review';
      subject.disabled = phase === 'recording'; audioOnly.disabled = phase !== 'idle';
      video.hidden = phase === 'idle' || (audioOnly.checked && phase !== 'review');
    };
    const release = () => { stream?.getTracks().forEach((track) => track.stop()); stream = null; };
    enable.addEventListener('click', async () => {
      enable.disabled = true; setState('Autorisation demandée au navigateur…');
      try {
        stream = await navigator.mediaDevices.getUserMedia(audioOnly.checked ? { audio: true } : { audio: true, video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } });
        if (!dock.node) { release(); return; }
        video.srcObject = stream; video.muted = true;
        setState(audioOnly.checked ? 'Micro prêt' : 'Caméra prête'); layout('ready');
      } catch (error) {
        enable.disabled = false;
        setState(error?.name === 'NotAllowedError' ? 'Accès refusé. Autorisez la caméra et le micro dans les réglages du navigateur.' : 'Aucune caméra ou micro disponible sur cet appareil.');
      }
    });
    function start() {
      const type = pickType(audioOnly.checked);
      try { recorder = new MediaRecorder(stream, { ...(type ? { mimeType: type } : {}), videoBitsPerSecond: 1_000_000, audioBitsPerSecond: 64_000 }); }
      catch { recorder = new MediaRecorder(stream); }
      chunks = [];
      recorder.addEventListener('dataavailable', (event) => { if (event.data?.size) chunks.push(event.data); });
      recorder.addEventListener('stop', () => {
        window.clearInterval(timer); window.clearTimeout(cap);
        const mime = (recorder.mimeType || type || (audioOnly.checked ? 'audio/webm' : 'video/webm')).split(';')[0];
        recorded = new Blob(chunks, { type: mime });
        reviewUrl = URL.createObjectURL(recorded);
        video.srcObject = null; video.src = reviewUrl; video.muted = false; video.controls = true; video.hidden = false;
        setState(`Enregistrement de ${Math.round((Date.now() - startedAt) / 1000)} s prêt à envoyer`); layout('review');
      });
      recorder.start(1000); startedAt = Date.now();
      layout('recording');
      const tick = () => { const seconds = Math.floor((Date.now() - startedAt) / 1000); setState(`Enregistrement ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} / 5:00`, true); };
      tick(); timer = window.setInterval(tick, 500);
      cap = window.setTimeout(() => { if (recorder?.state === 'recording') { bridge.notify('Limite de 5 minutes atteinte : l’enregistrement est arrêté.'); stop(); } }, RECORDING_LIMIT * 1000);
    }
    function stop() { if (recorder?.state === 'recording') recorder.stop(); }
    send.addEventListener('click', async () => {
      if (!recorded?.size) return;
      send.disabled = true; again.disabled = true; setState('Envoi au dossier…');
      const isVideo = recorded.type.startsWith('video/'), extension = recorded.type.includes('mp4') ? (isVideo ? 'mp4' : 'm4a') : 'webm';
      const topic = subject.value.trim();
      try {
        const created = await bridge.save(recorded, {
          name: safeName(`${isVideo ? 'Message vidéo' : 'Message vocal'} — ${topic ? `${topic} — ` : ''}${stampLabel()}`, extension), mimeType: recorded.type, sourceType: 'declaration',
          sourceReference: `${isVideo ? 'Message vidéo' : 'Message vocal'} enregistré dans le portail le ${stampLabel()}${topic ? `. Objet : ${topic}` : ''}.`.slice(0, 2048),
        });
        release(); bridge.notify('Votre message est au dossier. Votre avocat le retrouve sous « Messages vidéo ».');
        closeDock(true);
        if (created) openFile(created);
      } catch (error) { setState(error.message); send.disabled = false; again.disabled = false; }
    });
    const body = el('div', { class: 'recorder' }, [intro, video, state, subject, controls,
      el('p', { class: 'recorder-note', text: 'Le message est versé au dossier comme « Déclaration ». Il n’est ni transcrit ni analysé automatiquement, et seules les personnes habilitées au dossier peuvent le voir.' })]);
    layout('idle');
    openDock({ title: 'Message vidéo pour votre avocat', kind: 'recorder', body, defaultMode: 'third', label: 'l’enregistreur',
      cleanup: () => { window.clearInterval(timer); window.clearTimeout(cap); if (recorder?.state === 'recording') recorder.stop(); release(); if (reviewUrl) URL.revokeObjectURL(reviewUrl); },
      guard: () => !(recorder?.state === 'recording' || (recorded && !send.disabled)) || window.confirm('Fermer sans envoyer le message enregistré ?') });
  }

  // ---------- Presentation (.pptx) from the case's images ----------
  async function openPresentation() {
    if (!bridge) return;
    const images = bridge.docs().filter((doc) => kindOf(doc) === 'image');
    const caseTitle = bridge.caseTitle();
    const titleInput = el('input', { type: 'text', maxlength: '160', value: `Présentation — ${caseTitle || 'dossier'}`, 'aria-label': 'Titre de la présentation' });
    const list = el('ul', { class: 'slide-pick' }, images.map((doc, index) => el('li', {}, [
      el('label', { class: 'checkbox-filter' }, [el('input', { type: 'checkbox', value: doc.id, checked: index < 12 }), ` ${doc.name}`]),
    ])));
    const status = el('p', { class: 'table-subtext', role: 'status', text: images.length ? 'Une diapositive par image, avec sa légende si elle a été annotée dans le portail.' : 'Ajoutez ou annotez d’abord des images (photos, plans, captures).' });
    const make = button(bridge.canSave() ? 'Créer et enregistrer' : 'Créer (aperçu)', { cls: 'button small', glyph: 'slides', disabled: !images.length || bridge.isDemo() });
    make.addEventListener('click', async () => {
      const chosen = [...list.querySelectorAll('input:checked')].map((input) => images.find((doc) => doc.id === input.value)).filter(Boolean);
      if (!chosen.length) { status.textContent = 'Choisissez au moins une image.'; return; }
      make.disabled = true; status.textContent = 'Préparation des diapositives…';
      try {
        const slides = [];
        for (const doc of chosen) {
          const image = await loadImage(await cachedBlob(doc));
          const ratio = Math.min(1, 1920 / Math.max(image.width, image.height));
          const canvas = makeCanvas(image.width * ratio, image.height * ratio);
          canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height); image.close?.();
          const jpeg = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
          const legend = String(doc.extractedText || '').startsWith('Légende des repères') ? doc.extractedText.split('\n').slice(1, 7) : [];
          slides.push({ title: doc.name.replace(/\.[a-z0-9]{2,5}$/iu, ''), alt: doc.name, caption: legend.length ? legend : [`${bridge.sourceLabel(doc.sourceType)} · ${doc.sourceReference || 'provenance à préciser'}`.slice(0, 220)],
            image: { data: new Uint8Array(await jpeg.arrayBuffer()), ext: 'jpeg', width: canvas.width, height: canvas.height } });
        }
        const title = titleInput.value.trim() || 'Présentation';
        const bytes = pptxFromSlides(slides, { title, subtitle: `${caseTitle || ''} · ${stampLabel()}` });
        const blob = new Blob([bytes], { type: MIME.pptx });
        if (bridge.canSave()) {
          await bridge.save(blob, { name: safeName(title, 'pptx'), mimeType: MIME.pptx, sourceType: 'analyse', sourceReference: `Présentation préparée dans le portail le ${stampLabel()} à partir de ${chosen.length} image${chosen.length > 1 ? 's' : ''} du dossier.`, extractedText: slides.map((slide) => [slide.title, ...slide.caption].join('\n')).join('\n\n').slice(0, 200000) });
          bridge.notify('La présentation est enregistrée dans le dossier (.pptx).');
        }
        downloadBlob(blob, safeName(title, 'pptx'));
        closeDock(true);
      } catch (error) { status.textContent = error.message || 'La présentation n’a pas pu être créée.'; make.disabled = false; }
    });
    openDock({ title: 'Créer une présentation', kind: 'slides', defaultMode: 'third', label: 'la présentation',
      body: el('div', { class: 'slide-builder' }, [
        el('label', { text: 'Titre' }), titleInput, el('p', { class: 'slide-builder-head', text: `Images du dossier (${images.length})` }), list, status,
        el('p', { class: 'table-subtext', text: 'Le fichier PowerPoint est produit dans votre navigateur. Mise en page assistée par IA : à connecter, facturée à l’heure.' }),
      ]), foot: [el('small', { text: 'Format .pptx — PowerPoint, Keynote, LibreOffice.' }), make] });
  }

  // ---------- Mobile shell: drawer, tab bar, swipe between sections ----------
  function setDrawer(open) {
    document.body.classList.toggle('drawer-open', open);
    for (const id of ['menu-button', 'tabbar-more']) document.getElementById(id)?.setAttribute('aria-expanded', String(open));
    const nav = document.getElementById('workspace-nav');
    if (open) nav?.querySelector('button')?.focus({ preventScroll: true });
  }
  function initShell() {
    document.getElementById('menu-button')?.addEventListener('click', () => setDrawer(!document.body.classList.contains('drawer-open')));
    document.getElementById('tabbar-more')?.addEventListener('click', () => setDrawer(true));
    document.getElementById('drawer-scrim')?.addEventListener('click', () => { setDrawer(false); document.getElementById('menu-button')?.focus(); });
    document.getElementById('workspace-nav')?.addEventListener('click', (event) => { if (event.target.closest('[data-view]')) setDrawer(false); });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (document.body.classList.contains('drawer-open')) { setDrawer(false); document.getElementById('menu-button')?.focus(); return; }
      if (dock.node && !document.getElementById('workspace-dialog')?.open) { event.preventDefault(); closeDock(); }
    });
    const main = document.getElementById('main-content');
    let touch = null;
    main?.addEventListener('touchstart', (event) => {
      const target = event.target;
      if (event.touches.length !== 1 || target.closest('input, textarea, select, canvas, video, audio, iframe, [contenteditable], .table-wrap, .dropzone, .search-results, [data-no-swipe]')) { touch = null; return; }
      touch = { x: event.touches[0].clientX, y: event.touches[0].clientY, t: Date.now() };
    }, { passive: true });
    main?.addEventListener('touchend', (event) => {
      if (!touch || !bridge || document.body.classList.contains('drawer-open') || dock.node?.dataset.mode === 'full') { touch = null; return; }
      const dx = event.changedTouches[0].clientX - touch.x, dy = event.changedTouches[0].clientY - touch.y, quick = Date.now() - touch.t < 650;
      touch = null;
      if (!quick || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.6 || String(window.getSelection?.() || '')) return;
      const views = bridge.views(), index = views.indexOf(bridge.currentView());
      const next = views[index + (dx < 0 ? 1 : -1)];
      if (index < 0 || !next) return;
      main.classList.remove('slide-next', 'slide-prev'); void main.offsetWidth;
      main.classList.add(dx < 0 ? 'slide-next' : 'slide-prev');
      bridge.navigate(next);
    }, { passive: true });
    main?.addEventListener('animationend', () => main.classList.remove('slide-next', 'slide-prev'));
  }

  function init(api) {
    bridge = api;
    if (hasDom) initShell();
  }
  const api = { init, openFile, openEditor, openStudio, recordVideo, openPresentation, afterRender, closeDock, reset, kindOf, internals };
  if (typeof window !== 'undefined') window.BAWorkspace = api;
})();
