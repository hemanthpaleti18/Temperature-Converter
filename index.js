const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
const app = express();
const jwt = require('jsonwebtoken');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); 

const { initializeApp,cert} = require('firebase-admin/app');
const { getFirestore} = require('firebase-admin/firestore');
var serviceAccount = require("./Newdiet.json");
initializeApp({
  credential: cert(serviceAccount),
  ignoreUndefinedProperties: true
});
const db = getFirestore(); 

const bcrypt=require('bcrypt');

app.set("view engine", "ejs")
app.set("views", path.join (__dirname,"public"))

// Simulated user data (for the sake of example)
const users = [];

app.get('/home', (req, res) => {
  res.render( "home");
});

app.get('/about', (req, res) => {
  res.render( "about");
});

app.use(express.static(path.join(__dirname,'images')));

app.get("/signup", (req, res)=>{
  const alertmessage=req.query.alertmessage;
  res.render( "signup",{alertmessage});
})

  // Route for user signup
  app.post('/signupsubmit', async (req, res) => {
    const user = {
      email: req.body.email,
      password: await bcrypt.hash(req.body.signupPassword, 10), 
      Firstname: req.body.firstName,
      Lastname: req.body.lastName
    }
    
    try {
      // Check if user already exists
      const userRef = db.collection('todo');
      const userDoc = await userRef.where('email', '==', user.email).get();
      if (!userDoc.empty) {
        const alertmessage=encodeURIComponent('User already exists. please Login');
        return res.redirect(`/signup?alertmessage=${alertmessage}`);
      }
  
      // Create user in Firestore
      await userRef.add(user);
      const alertmessage=encodeURIComponent('User created Successfully');
      return res.redirect(`/signup?alertmessage=${alertmessage}`);
    } catch (error) {
      console.error('Error creating user:', error);
      const alertmessage=encodeURIComponent('An error occured');
      return res.redirect(`/signup?alertmessage=${alertmessage}`);
    }
  }); 
 
  // Route for user login
app.get("/login", (req, res)=>{
  const alertmessage=req.query.alertmessage;
  res.render( "login",{alertmessage});
 })

app.post('/loginsubmit', async (req, res) => {
  const email = req.body.loginEmail;
  try {
    const userRef = db.collection('todo');
    const querySnapshot = await userRef.where('email', '==', email).get();

    if (querySnapshot.empty) {
      const alertmessage = 'User not found. Please register.';
      return res.redirect(`/login?alertmessage=${encodeURIComponent(alertmessage)}`);
    }

    const userDoc = querySnapshot.docs[0]; 
    const storedEmail = userDoc.data().email; 
    const enteredEmail = req.body.loginEmail;

    if (storedEmail === enteredEmail) {
      const userPassword = userDoc.data().password;
      const enteredPassword = req.body.loginPassword;
      const isPasswordCorrect = await bcrypt.compare(req.body.loginPassword, userPassword); // Corrected variable name
    
      if (isPasswordCorrect) { // Check if the password is correct
        const alertmessage = 'Login successful';
        return res.redirect(`/main?alertmessage=${encodeURIComponent(alertmessage)}`);
      } else {
        const alertmessage = 'Incorrect password.';
        return res.redirect(`/login?alertmessage=${encodeURIComponent(alertmessage)}`);
      }
    } else {
      const alertmessage = 'Please check your email ID.';
      return res.redirect(`/login?alertmessage=${encodeURIComponent(alertmessage)}`);
    }
    
  } catch (error) {
    console.error('Error checking user:', error);
    const alertmessage = 'An error occurred';
    return res.redirect(`/login?alertmessage=${encodeURIComponent(alertmessage)}`);
  }
});

app.get('/main', (req, res) => {
  const alertmessage=req.query.alertmessage;
  const celsius=req.query.celsius;
  const fahrenheit=req.query.fahrenheit;
  const kelvin=req.query.kelvin;
  res.render( "main",{alertmessage,celsius,fahrenheit,kelvin});
});

app.post('/search', async (req, res) => {
  const searchTerm = req.body.searchTerm;

  const axios = require('axios');
  const options = {
    method: 'GET',
    url: `https://spoonacular.com/food-api/${encodeURIComponent(searchTerm)}`,
   
    headers: {
      'X-RapidAPI-Key': 'fdf2a12fbb8a4fcfa2688294608b91b7',
      // 'X-RapidAPI-Host': 'food-nutrition-information.p.rapidapi.com'
    }
  };
  
  try {
    const response = await axios.request(options);
    console.log(response.data);
  } catch (error) {
    console.error(error);
  }

});

app.get('/forgotpassword', (req, res) => {
  res.render('forgotpassword'); // Render the forgot password page
});

// Define a function to generate a reset token (You can use a library like 'crypto' or 'uuid')
function generateResetToken() {
  // Implement the logic to generate a unique token or link here
  // Example:
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  return token;
}

// Define a function to store the reset token in a database or cache
async function storeResetTokenInDatabase(userEmail, resetToken) {
  try {
    // Implement the logic to store the reset token along with the user's email
    // Example: You can use Firebase Firestore to store this information
    const tokenDocRef = db.collection('reset_tokens').doc(userEmail);
    await tokenDocRef.set({ token: resetToken });
  } catch (error) {
    throw error;
  }
}

// Define a function to send a password reset email
async function sendPasswordResetEmail(userEmail, resetToken) {
  try {
    // Implement the logic to send a password reset email to the user
    // You can use libraries like Nodemailer to send emails
    const transporter = nodemailer.createTransport({
      service: 'your-email-service-provider', // e.g., 'Gmail'
      auth: {
        user: 'your-email@example.com',
        pass: 'your-email-password'
      }
    });

    const mailOptions = {
      from: 'your-email@example.com',
      to: userEmail,
      subject: 'Password Reset',
      text: `Click the following link to reset your password: ${resetToken}`,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    throw error;
  }
}

app.post('/forgot-password', async (req, res) => {
  const userEmail = req.body.email;
  try {
    // Generate a unique token or link
    const resetToken = generateResetToken();

    // Store the reset token in a database or cache along with the user's email
    await storeResetTokenInDatabase(userEmail, resetToken);

    // Send a password reset email to the user with the reset link
    await sendPasswordResetEmail(userEmail, resetToken);

    // Redirect the user to a confirmation page
    res.render('password-reset-confirmation'); // Create this view
  } catch (error) {
    console.error('Error sending password reset email:', error);
    res.render('error-page'); // Create this view
  }
});


app.post('/temperature', (req, res) => {
  const { temperature, conversionType } = req.body;

  if (conversionType === 'Fahrenheit') {
    fahrenheit = temperature;
    celsius = ((temperature - 32) * 5) / 9;
    kelvin = ((temperature - 32) * 5) / 9 + 273.15;
    console.log('Redirecting to main with values:', celsius, fahrenheit, kelvin);
    res.redirect(`/main?celsius=${encodeURIComponent(celsius)}&fahrenheit=${encodeURIComponent(fahrenheit)}&kelvin=${encodeURIComponent(kelvin)}`)
  } else if (conversionType === 'celsius') {
    celsius = temperature;
    fahrenheit = (temperature * 9) / 5 + 32;
    kelvin = temperature + 273.15;
    res.redirect(`/main?celsius=${encodeURIComponent(celsius)}&fahrenheit=${encodeURIComponent(fahrenheit)}&kelvin=${encodeURIComponent(kelvin)}`);
  } else if (conversionType === 'kelvin') {
    kelvin = temperature;
    celsius = temperature - 273.15;
    fahrenheit = (temperature - 273.15) * (9 / 5) + 32;
    res.redirect(`/main?celsius=${encodeURIComponent(celsius)}&fahrenheit=${encodeURIComponent(fahrenheit)}&kelvin=${encodeURIComponent(kelvin)}`);
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


