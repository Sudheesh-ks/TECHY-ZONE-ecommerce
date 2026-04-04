require("dotenv").config();

const SibApiV3Sdk = require("sib-api-v3-sdk");

const client = SibApiV3Sdk.ApiClient.instance;
client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000);
}

// Send OTP
async function sendOTP(email, otp) {
  const emailData = new SibApiV3Sdk.SendSmtpEmail();

  emailData.subject = "Your OTP Code";
  emailData.sender = {
    name: "Stockify",
    email: process.env.SENDER_EMAIL,
  };

  emailData.to = [{ email: email }];

  emailData.htmlContent = `
    <h3>Your OTP Code</h3>
    <p>Your OTP is: <b>${otp}</b></p>
    <p>This OTP is valid for 10 minutes.</p>
  `;

  try {
    await apiInstance.sendTransacEmail(emailData);
    console.log("OTP sent to:", email);
  } catch (error) {
    console.error(
      "Brevo error:",
      error.response?.body || error.message || error
    );
  }
}

module.exports = { generateOTP, sendOTP };