import React from 'react';
import { Link } from 'react-router-dom';
import WhatsAppLinks from '../../components/shared/WhatsAppLinks';

const COMPANY = 'Daily Cart 24/7 Private Limited';
const CIN = 'U52202KA2019PTC128429';
const ADDRESS = 'D#105, Jai Prime Apartment, Alpha Garden, Kodigehalli, KR Puram, Bengaluru 560048';
const EMAILS = ['mohan.reddy02@gmail.com', 'support@dailycart24x7.com'];

const COPY = {
  privacy: {
    title: 'Privacy policy',
    updated: '21 August 2026',
    sections: [
      {
        heading: 'Who we are',
        body: `${COMPANY} (CIN ${CIN}) operates dailycartindia.com. We run a neighbourhood kirana and home-services marketplace. Office: ${ADDRESS}.`,
      },
      {
        heading: 'What we collect',
        body: 'When you create an account or place an order we collect your name, email, phone, delivery address, order details, and payment status. We do not store full card numbers. Online payments are processed by Razorpay.',
      },
      {
        heading: 'How we use it',
        body: 'We use this information to fulfil orders and bookings, talk to you about your order, prevent fraud, and improve the service. We do not sell your personal data.',
      },
      {
        heading: 'Sharing',
        body: 'We share only what a store or service partner needs to complete your order (name, phone, address, items). Payment processors receive what they need to take payment. We may share data if the law requires it.',
      },
      {
        heading: 'Your rights',
        body: `You can ask to see, correct, or delete your account data by emailing ${EMAILS[0]} or ${EMAILS[1]}, or by WhatsApp.`,
      },
    ],
  },
  terms: {
    title: 'Terms of use',
    updated: '21 August 2026',
    sections: [
      {
        heading: 'The service',
        body: `${COMPANY} connects you with nearby kirana stores and home-service partners on dailycartindia.com. We are a marketplace. Stores and service partners supply the goods and do the work.`,
      },
      {
        heading: 'Accounts and orders',
        body: 'You must give a real delivery address and contact number. Prices, stock, and delivery windows are shown by the partner and can change. We may cancel an order if an item is unavailable or if we suspect misuse.',
      },
      {
        heading: 'Payments',
        body: 'You can pay online (UPI, cards, netbanking via Razorpay) or cash on delivery where offered. Online charges are collected by Razorpay for Daily Cart. Delivery fees are shown at checkout before you pay.',
      },
      {
        heading: 'Partners',
        body: 'Store and service partners are independent businesses. Quality, timing, and product condition are their responsibility, with our support if something goes wrong.',
      },
      {
        heading: 'Contact',
        body: `${ADDRESS}. Email ${EMAILS[0]} or ${EMAILS[1]}, or WhatsApp the numbers below.`,
      },
    ],
  },
  refund: {
    title: 'Refund and cancellation',
    updated: '21 August 2026',
    sections: [
      {
        heading: 'Grocery orders',
        body: 'Cancel before the store starts packing and we refund the full amount (including delivery, if charged online). After packing or dispatch, refunds are for missing, damaged, or wrong items only — tell us within 24 hours with a photo if you can.',
      },
      {
        heading: 'Home services',
        body: 'Cancel a booking at least 2 hours before the slot for a full refund. If a partner does not arrive or the job is not done as booked, we will refund or rebook.',
      },
      {
        heading: 'How refunds are paid',
        body: 'Online payments are refunded to the original UPI/card/netbanking method, usually in 5–7 working days. Cash-on-delivery orders are refunded by bank transfer or UPI after we confirm the issue.',
      },
      {
        heading: 'How to ask',
        body: `Use My orders in the app, email ${EMAILS[0]} / ${EMAILS[1]} with your order number, or WhatsApp us.`,
      },
    ],
  },
};

export default function LegalPage({ kind }) {
  const doc = COPY[kind] || COPY.privacy;
  return (
    <article className="mx-auto max-w-2xl space-y-6 py-8">
      <div>
        <h1 className="font-display text-2xl font-bold">{doc.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {COMPANY} · Last updated {doc.updated}
        </p>
      </div>
      {doc.sections.map((s) => (
        <section key={s.heading}>
          <h2 className="mb-1 text-base font-semibold">{s.heading}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
        </section>
      ))}
      <WhatsAppLinks className="text-sm text-muted-foreground" />
      <p className="text-xs text-muted-foreground">
        <Link className="underline" to="/privacy">Privacy</Link>
        {' · '}
        <Link className="underline" to="/terms">Terms</Link>
        {' · '}
        <Link className="underline" to="/refund">Refunds</Link>
      </p>
    </article>
  );
}
