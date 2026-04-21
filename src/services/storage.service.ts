import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '@/services/firebase';

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 96);
}

/**
 * Envia uma imagem para o Firebase Storage (pasta `products/gallery/{uid}/...`)
 * e devolve a URL pública de download.
 */
export async function uploadProductGalleryImage(file: File): Promise<string> {
  const user = auth.currentUser;
  if (!user?.uid) {
    throw new Error('AUTH_REQUIRED');
  }
  const safe = sanitizeFileName(file.name || 'imagem.jpg');
  const path = `products/gallery/${user.uid}/${Date.now()}_${safe}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, {
    contentType: file.type || 'image/jpeg',
  });
  return getDownloadURL(storageRef);
}
