import { createAvatar } from '@dicebear/core';
import * as collection from '@dicebear/collection';

export function getAvatarUrl(seed: string): string {
  const avatar = createAvatar(collection.notionists, {
    seed,
    size: 128,
    backgroundColor: ['1a1a2e'],
  });
  return avatar.toDataUri();
}
