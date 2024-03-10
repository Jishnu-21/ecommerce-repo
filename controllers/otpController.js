// otpController.js
const nodemailer = require('nodemailer');
const randomstring = require('randomstring');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'jpjishnu21@gmail.com', // Your Gmail address
    pass: 'ysuz qhuc qjee oech' // Your Gmail password or an app-specific password
  }
});

function generateOTP() {
  return randomstring.generate({
    length: 6,
    charset: 'numeric'
  });
}

function sendVerificationEmail(email, otp) {
  const mailOptions = {
    from: 'your-email@gmail.com',
    to: email,
    subject: 'Account Verification OTP',
    text: `Your OTP for account verification is: ${otp}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });

}

  function startOTPTimer(duration, callback) {
    let seconds = duration;
  
    const timer = setInterval(() => {
      if (seconds <= 0) {
        clearInterval(timer);
        callback(); // Execute the callback when the timer reaches zero
      }
  
      seconds--;
    }, 1000);
  }
  


module.exports = {
  generateOTP,
  sendVerificationEmail,
  startOTPTimer,
};
