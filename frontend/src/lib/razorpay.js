/** Load Razorpay Checkout.js and open the payment modal. */

export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * @param {object} session - from POST /payments/razorpay/create
 * @returns {Promise<{ razorpay_order_id: string, razorpay_payment_id: string, razorpay_signature: string }>}
 */
export function openRazorpayCheckout(session) {
  return new Promise(async (resolve, reject) => {
    const ok = await loadRazorpayScript();
    if (!ok || !window.Razorpay) {
      reject(new Error('Could not load Razorpay. Check your network and try again.'));
      return;
    }
    const rzp = new window.Razorpay({
      key: session.key_id,
      amount: session.amount,
      currency: session.currency || 'INR',
      name: session.name || 'DailyCart',
      description: session.description || 'Payment',
      order_id: session.order_id,
      prefill: session.prefill || {},
      theme: { color: '#0F766E' },
      handler(response) {
        resolve({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss() {
          reject(new Error('Payment cancelled'));
        },
      },
    });
    rzp.on('payment.failed', (response) => {
      const msg = response?.error?.description || 'Payment failed';
      reject(new Error(msg));
    });
    rzp.open();
  });
}
