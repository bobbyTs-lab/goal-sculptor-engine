import { Contact, generateId } from '@/lib/storage';

export interface ImportedContact {
  name: string;
  phone?: string;
  email?: string;
}

// --- Contact Picker API (Android Chrome, some PWA browsers) ---

interface ContactPickerContact {
  name?: string[];
  email?: string[];
  tel?: string[];
}

interface ContactsManager {
  select(
    properties: string[],
    options?: { multiple?: boolean }
  ): Promise<ContactPickerContact[]>;
  getProperties(): Promise<string[]>;
}

declare global {
  interface Navigator {
    contacts?: ContactsManager;
  }
}

export function isContactPickerSupported(): boolean {
  return 'contacts' in navigator && 'ContactsManager' in window;
}

export async function pickContactsFromPhone(): Promise<ImportedContact[]> {
  if (!navigator.contacts) {
    throw new Error('Contact Picker API not supported');
  }

  const supported = await navigator.contacts.getProperties();
  const properties = ['name', 'tel', 'email'].filter(p => supported.includes(p));

  const results = await navigator.contacts.select(properties, { multiple: true });

  return results
    .filter(c => c.name?.[0])
    .map(c => ({
      name: c.name![0],
      phone: c.tel?.[0] || undefined,
      email: c.email?.[0] || undefined,
    }));
}

// --- vCard (.vcf) file parsing ---

export function parseVCard(vcfText: string): ImportedContact[] {
  const contacts: ImportedContact[] = [];
  const cards = vcfText.split('BEGIN:VCARD');

  for (const card of cards) {
    if (!card.includes('END:VCARD')) continue;

    let name = '';
    let phone: string | undefined;
    let email: string | undefined;

    const lines = card.split(/\r?\n/);
    for (const line of lines) {
      // Handle FN (formatted name)
      if (line.startsWith('FN:') || line.startsWith('FN;')) {
        name = line.split(':').slice(1).join(':').trim();
      }
      // Handle N (structured name) as fallback
      if (!name && (line.startsWith('N:') || line.startsWith('N;'))) {
        const parts = line.split(':').slice(1).join(':').split(';');
        const lastName = parts[0]?.trim() || '';
        const firstName = parts[1]?.trim() || '';
        name = [firstName, lastName].filter(Boolean).join(' ');
      }
      // Handle TEL
      if (line.startsWith('TEL') && !phone) {
        phone = line.split(':').slice(1).join(':').trim();
      }
      // Handle EMAIL
      if (line.startsWith('EMAIL') && !email) {
        email = line.split(':').slice(1).join(':').trim();
      }
    }

    if (name) {
      contacts.push({ name, phone, email });
    }
  }

  return contacts;
}

export function readVCardFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// --- Duplicate detection ---

export function findDuplicates(
  imported: ImportedContact[],
  existing: Contact[]
): { unique: ImportedContact[]; duplicates: ImportedContact[] } {
  const existingPhones = new Set(
    existing.map(c => c.phone?.replace(/\D/g, '')).filter(Boolean)
  );
  const existingEmails = new Set(
    existing.map(c => c.email?.toLowerCase()).filter(Boolean)
  );
  const existingNames = new Set(
    existing.map(c => c.name.toLowerCase())
  );

  const unique: ImportedContact[] = [];
  const duplicates: ImportedContact[] = [];

  for (const contact of imported) {
    const phoneNorm = contact.phone?.replace(/\D/g, '');
    const emailNorm = contact.email?.toLowerCase();
    const nameNorm = contact.name.toLowerCase();

    const isDup =
      (phoneNorm && existingPhones.has(phoneNorm)) ||
      (emailNorm && existingEmails.has(emailNorm)) ||
      existingNames.has(nameNorm);

    if (isDup) {
      duplicates.push(contact);
    } else {
      unique.push(contact);
    }
  }

  return { unique, duplicates };
}

// --- Convert imported contacts to app Contact objects ---

export function importedToContacts(imported: ImportedContact[]): Omit<Contact, 'id' | 'createdAt'>[] {
  return imported.map(c => ({
    name: c.name,
    relationship: 'acquaintance' as const,
    circleRing: 'distant' as const,
    influenceTag: 'neutral' as const,
    phone: c.phone,
    email: c.email,
    notes: '',
    plan: '',
  }));
}
