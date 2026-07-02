const express = require('express') //this is how noe imports libraries. same concept as python
const axios = require('axios')
require('dotenv').config()

const app = express()
app.use(express.json())
app.use(express.static('public')) /* what this does is that, it tells js to serve any 
into the public folder direcly, ie where public.html is located. 
so when someone visits the local host, it opens up the inex.hrml  */

// Step 1: Get access token from Safaricom
async function getAccessToken() {
  const auth = Buffer.from(
    `${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}` //recieves authorisation from my keys in .env
  ).toString('base64')

  const response = await axios.get(
    'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${auth}`
      }
    }
  )

  return response.data.access_token
}

// Step 2: Send STK Push
app.post('/pay', async (req, res) => {   //this will be the point where the front end shows 'send money', and a user clicks it
  const { phone, amount } = req.body   //this one is shown in the frontend an contains phone number and  amount that a user keys in

  try {
    const token = await getAccessToken()

    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14) //this is just a time stamp in the order yyyymmmddhhmmss, and it is used to generate a password for the transaction

    const password = Buffer.from(
      `${process.env.SHORTCODE}${process.env.PASSKEY}${timestamp}`
    ).toString('base64')

    const response = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        BusinessShortCode: process.env.SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: phone,
        PartyB: process.env.MY_NUMBER,  /* this is the number that receives the money */
        PhoneNumber: phone,
        CallBackURL: 'https://mydomain.com/callback',  /* this is where safaricom sends back payment result after user enters pin
        it is currently a fake url since this is a sandbox and doesnt need to be real */
        AccountReference: 'SendRitaMoney',
        TransactionDesc: 'Sending Rita money'
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    res.json({ success: true, data: response.data })
  } catch (error) {
    res.json({ success: false, error: error.message })
  }

  {
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ]
}

})

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})