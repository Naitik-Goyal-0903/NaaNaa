const axios = require('axios');

// WhatsApp service using Twilio or mock
const sendWhatsAppMessage = async (phoneNumber, message) => {
  try {
    // Using Twilio WhatsApp API
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID || 'YOUR_TWILIO_SID';
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || 'YOUR_TWILIO_TOKEN';
    const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155552671';

    // If Twilio credentials are not set, just log the message for development
    if (twilioAccountSid === 'YOUR_TWILIO_SID') {
      console.log('📱 [WHATSAPP MESSAGE] (DEV MODE - Not sent)');
      console.log(`To: +91${phoneNumber}`);
      console.log(`Message:\n${message}`);
      return { success: true, mode: 'development', message: 'Message logged to console' };
    }

    // Real Twilio API call
    const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    
    const response = await axios.post(url, {
      From: twilioWhatsAppNumber,
      To: `whatsapp:+91${phoneNumber}`,
      Body: message
    }, {
      auth: {
        username: twilioAccountSid,
        password: twilioAuthToken
      }
    });

    console.log('✅ WhatsApp message sent:', response.data.sid);
    return { success: true, messageSid: response.data.sid };
  } catch (err) {
    console.error('❌ WhatsApp sending error:', err.message);
    return { success: false, error: err.message };
  }
};

module.exports = { sendWhatsAppMessage };
