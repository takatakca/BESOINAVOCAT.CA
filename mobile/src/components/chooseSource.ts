// Native choice sheet: camera, photo library or files.
import { ActionSheetIOS, Alert, Platform } from 'react-native';
import type { Source } from '../lib/files';

export function chooseSource(onPick: (s: Source) => void) {
  const options: { label: string; value: Source }[] = [
    { label: 'Prendre une photo', value: 'camera' },
    { label: 'Choisir une image', value: 'library' },
    { label: 'Choisir un fichier (PDF, Word…)', value: 'files' },
  ];
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions({ options: [...options.map(o => o.label), 'Annuler'], cancelButtonIndex: options.length, title: 'Ajouter une pièce' }, i => { if (i < options.length) onPick(options[i]!.value); });
  } else {
    Alert.alert('Ajouter une pièce', undefined, [...options.map(o => ({ text: o.label, onPress: () => onPick(o.value) })), { text: 'Annuler', style: 'cancel' as const }]);
  }
}
