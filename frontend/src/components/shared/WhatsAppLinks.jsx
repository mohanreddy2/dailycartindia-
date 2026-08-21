import React from 'react';
import { WHATSAPP_CONTACTS, waMeUrl } from '../../lib/contact';
import { cn } from '../../lib/utils';

export default function WhatsAppLinks({ className, prefix = 'WhatsApp' }) {
  return (
    <p className={cn('flex flex-wrap items-center gap-x-3 gap-y-1', className)}>
      {prefix ? <span>{prefix}</span> : null}
      {WHATSAPP_CONTACTS.map((c) => (
        <a
          key={c.digits}
          href={waMeUrl(c.digits)}
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:underline"
        >
          {c.label}
        </a>
      ))}
    </p>
  );
}
