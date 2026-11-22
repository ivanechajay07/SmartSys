import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { initialsOf } from '@/lib/avatar';

export function UserAvatar({
  name,
  src,
  size = 36,
  presence,
  className,
}: {
  name?: string | null;
  src?: string | null;
  size?: number;
  presence?: 'online' | 'offline';
  className?: string;
}) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [src]);

  return (
    <span
      className={clsx('user-avatar', className)}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.34)) }}
      title={name ?? undefined}
    >
      {src && !broken ? (
        <img src={src} alt={name ? `Avatar de ${name}` : 'Avatar'} onError={() => setBroken(true)} />
      ) : (
        <span aria-hidden>{initialsOf(name)}</span>
      )}
      {presence && (
        <i
          className={clsx('user-presence', presence === 'online' ? 'is-online' : 'is-offline')}
          role="img"
          aria-label={presence === 'online' ? 'En línea' : 'Desconectado'}
          title={presence === 'online' ? 'En línea' : 'Desconectado'}
        />
      )}
    </span>
  );
}
