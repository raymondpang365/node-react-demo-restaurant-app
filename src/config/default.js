/* @flow */
const xoauth2 = require('xoauth2');

module.exports = {
  listenTo: process.env.LISTEN_TO || 'localhost',
  host: process.env.NODE_HOST || 'localhost', // Define your host from 'package.json'
  port: 3001,
  publicPort: 3001,
  domainName: '',
  hasDomainName: false,
  backdoor: true,
  app: {
    htmlAttributes: { lang: 'en' },
    title: 'Test',
    titleTemplate: 'Test - %s',
    meta: [
      {
        name: 'description',
        content: 'The best react universal starter boilerplate in the world.'
      }
    ],
    links: [
      'https://fonts.googleapis.com/css?family=Tangerine',
      '/css/main.css'
    ]
  },
  fileUpload: {
    avatar: {
      maxSize: 1024 * 1024, // in bytes
      // MIME type
      validMIMETypes: ['image/jpeg', 'image/png', 'image/gif']
    }
  },
  jwt: {
    accessToken: {
      secret: process.env.JWT_ACCESS_TOKEN_SECRET,
      expiresIn: 60 // in seconds
    },
    refreshToken: {
      secret: process.env.JWT_REFRESH_TOKEN_SECRET,
      expiresIn: 60 * 60 * 24 * 180 // in seconds
    },
    verifyEmail: {
      secret: 'df5s6sdHdjJdRg56',
      expiresIn: 60 * 60 // in seconds
    },
    resetPassword: {
      secret: 'FsgWqLhX0Z6JvJfPYwPZ',
      expiresIn: 60 * 60 // in seconds
    }
  },
  passportStrategy: {
    facebook: require('./passportStrategy/facebook/credential').development,
    google: require('./passportStrategy/google/credential').development,
  },
  nodemailer:{
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USERNAME,
      pass: process.env.GMAIL_PASSWORD,
    },
  },
  mailOptions: {
    subject: 'Untitled Mail',
    from: 'Express-React-Hmr-Boilerplate <psfr937@gmail.com>',
    text: 'No Text',
    html: '<pre>no html content<pre>',
  },
  fcmServerKey: process.env.FCM_SERVER_KEY,
  recaptcha: process.env.RECAPTCHA_KEY
};
