export const WHATSAPP_CONTACTS = [
  { label: '+65 90628025', digits: '6590628025' },
  { label: '+91 9741188878', digits: '919741188878' },
  { label: '+91 9347533422', digits: '919347533422' },
  { label: '+91 9110759384', digits: '919110759384' },
];

export function waMeUrl(digits) {
  return `https://wa.me/${digits}`;
}
