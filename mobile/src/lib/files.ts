// Take a photo, pick an image or a file, then upload it to a case. Open a document by downloading it to the cache and
// handing it to the system viewer / share sheet.
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Directory, File, Paths } from 'expo-file-system';
import { api } from './api';
import { mimeFor } from './format';
import type { Document } from './types';

export type Picked = { uri: string; name: string; mimeType: string; size?: number };
export type Source = 'camera' | 'library' | 'files';

const stamp = () => new Date().toISOString().slice(0, 16).replace('T', ' ').replace(':', 'h');

export async function pick(source: Source): Promise<Picked | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) { Alert.alert('Appareil photo', 'Autorisez l’appareil photo dans les réglages pour photographier une pièce.'); return null; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85, exif: false });
    if (result.canceled || !result.assets[0]) return null;
    const a = result.assets[0];
    return { uri: a.uri, name: `Photo ${stamp()}.jpg`, mimeType: 'image/jpeg', size: a.fileSize };
  }
  if (source === 'library') {
    // Compatible mode: iOS hands over a JPEG instead of HEIC, which the portal does not accept.
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, exif: false, preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible });
    if (result.canceled || !result.assets[0]) return null;
    const a = result.assets[0];
    let name = a.fileName ?? `Image ${stamp()}.jpg`;
    let mimeType = mimeFor(name, a.mimeType);
    if (/hei[cf]/i.test(mimeType) || /\.hei[cf]$/i.test(name)) { name = name.replace(/\.hei[cf]$/i, '') + '.jpg'; mimeType = 'image/jpeg'; }
    return { uri: a.uri, name, mimeType, size: a.fileSize };
  }
  const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
  if (result.canceled || !result.assets[0]) return null;
  const a = result.assets[0];
  return { uri: a.uri, name: a.name, mimeType: mimeFor(a.name, a.mimeType), size: a.size };
}

// The portal refuses "/ \ : < > " | ? *" in names: keep the name readable and valid.
export const cleanName = (name: string) => name.replace(/[\\/:<>"|?*]/g, '-').replace(/\.+$/, '').slice(0, 200) || 'Pièce';

export async function upload(caseId: string, file: Picked, maxBytes: number | undefined, onProgress?: (r: number) => void): Promise<Document> {
  if (maxBytes && file.size && file.size > maxBytes) throw new Error(`Ce fichier dépasse la limite de ${Math.round(maxBytes / 1024 / 1024)} Mo par pièce.`);
  const { document } = await api.uploadDocument(caseId, { uri: file.uri, name: cleanName(file.name), mimeType: file.mimeType }, onProgress);
  return document;
}

export async function openDocument(caseId: string, doc: Document) {
  const folder = new Directory(Paths.cache, 'pieces');
  if (!folder.exists) folder.create({ intermediates: true, idempotent: true });
  const target = new File(folder, `${doc.id.slice(0, 8)}-${cleanName(doc.name)}`);
  if (!target.exists) {
    await File.downloadFileAsync(api.downloadUrl(caseId, doc.id), target, { headers: api.authHeaders() });
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error('Aucune application ne peut ouvrir ce fichier sur cet appareil.');
  await Sharing.shareAsync(target.uri, { mimeType: doc.mimeType, dialogTitle: doc.name, UTI: doc.mimeType === 'application/pdf' ? 'com.adobe.pdf' : undefined });
}
