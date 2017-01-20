const express = require("express");
const app = express();
const PORT = process.env.PORT || 8080; // default port 8080
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.set("view engine", "ejs");

let urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

let usersDatabase = {};

//Checks wether given URL is already in urlDatabase
function resolveLongURL (longURL) {
  for (let tinyURL in urlDatabase) {
    if (urlDatabase[tinyURL] === longURL) {
      return tinyURL;
    }
  }
}

//Checks wether given email is already in usersDatabase
function resolveEmail (email) {
  for (let userIDs in usersDatabase) {
    if (usersDatabase[userIDs].email === email) {
      return email;
    }
  }
}

//If given email and password, if exist in usersDatabase returns corresponding user_id
function confirmLogIn (email, password) {
  for (let userIDs in usersDatabase) {
    if (email === usersDatabase[userIDs].email && password === usersDatabase[userIDs].password) {
      return usersDatabase[userIDs].id;
    }
  }
}

function generateRandomString() {
  return Math.floor((1 + Math.random()) * 0x1000000).toString(16).substring(1);
}

//Root, redirects to /urls
app.get("/", (req, res) => {
  res.redirect("/urls")
});

//Main page where all links are displayed
app.get("/urls", (req, res) => {
  let templateVars = { urls: urlDatabase,
                       user_id: req.cookies["user_id"] };
  res.render("urls_index", templateVars);
});


//Page where user can add a new URL
app.get("/urls/new", (req, res) => {
  let templateVars = { urls: urlDatabase,
                       user_id: req.cookies["user_id"] };
  res.render("urls_new", templateVars);
});


app.get("/u/:shortURL", (req, res) => {

  if (urlDatabase.hasOwnProperty(req.params.shortURL)) {  //if user imputs nonexistent tinyURL,
    let longURL = urlDatabase[req.params.shortURL];        //redirects to the same webpage he is in (home)
    res.redirect(longURL);
  } else {
    res.redirect("/urls")
  }
});

//Registration page
app.get("/register", (req, res) => {
  res.render("users_register");
});

app.get("/login", (req, res) => {
  res.render("user_login");
});

//Registers new email and password to the local object database
app.post("/register", (req, res) => {
  let existingEmail = resolveEmail(req.body.email);

  if (existingEmail) {
    res.status(400).send('This email already exists');

  } if (!req.body.email) {
    res.status(400).send('Please type in an email');

  } else {
    //res.cookie("user_id" , req.body.user_id);
    let userID = generateRandomString();
    usersDatabase[userID] = {id: userID,
                             email: req.body.email,
                             password: req.body.password };
    res.redirect("/");
  }
});

//Logs person out
app.post("/logout", (req, res) => {
  res.cookie("user_id", '', {expires: new Date(0)});
  res.redirect("/");
});

//Accepts a login post
app.post("/login", (req, res) => {
  let tryEmail = req.body.email;
  let tryPassword = req.body.password;
  let userIdCookie = confirmLogIn(tryEmail, tryPassword);

  if (!userIdCookie) {
    res.status(403).send('Wrong email or password');
  } else {
    res.cookie("user_id" , userIdCookie);
    res.redirect("/");
  }

});

//Deletes selected tinyURL along with its corresponding URL
app.post("/urls/:id/delete", (req, res) => {
  delete urlDatabase[req.params.id];
  res.redirect("/urls");
});

//Updates/changes URL to which tinyURL points to
app.post("/urls/:tinyURL", (req, res) => {
  urlDatabase[req.params.tinyURL] = req.body.newURL;
  res.redirect("/urls");
});


//Adds a new link along with new tinyURL
app.post("/urls", (req, res) => {

  let exitstingShortURL = resolveLongURL(req.body.longURL)
  if (exitstingShortURL) {
    res.redirect(`/urls/${exitstingShortURL}`)
  } else {
    let newShortURL = generateRandomString();
    urlDatabase[newShortURL] = req.body.longURL;
    res.redirect(`/urls/${newShortURL}`);
  }
});

// Takes user to URL updating page
app.get("/urls/:id", (req, res) => {
  let templateVars = { shortURL: req.params.id,
                       longURL: urlDatabase[req.params.id],
                       user_id: req.cookies["user_id"]}

  res.render("urls_show", templateVars);
});


app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});