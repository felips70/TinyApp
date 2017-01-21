const express = require("express");
const app = express();
const PORT = process.env.PORT || 8080; //default port 8080
const bodyParser = require("body-parser");
const bcrypt = require('bcrypt');
const cookieSession = require('cookie-session');
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");

let urlDatabase = {}; //All URL links made by all users

let usersDatabase = {}; //UserID, email, password and user-specific specific links. Defined in user registration app.post

app.use(cookieSession({
  name: "session",
  secret: "somesecret"
}));

//Checks wether given URL is already in urlDatabase
function resolveLongURL (longURL, userID) {
  let userLinks = usersDatabase[userID].links;

  for (let tinyURL in userLinks) {
    if (userLinks[tinyURL] === longURL) {
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

//If given email and password, if exist in usersDatabase returns corresponding user_id, takes into account hashing passwords
function confirmLogIn (email, password) {
  // JH claims that every password works for every user.  Test if true.
  for (let userIDs in usersDatabase) {
    let currUserEmail = usersDatabase[userIDs].email;
    let hashedPassword = usersDatabase[userIDs].password;
    if (email === currUserEmail && bcrypt.compareSync(password, hashedPassword)) {
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
                       user_id: req.session.user_id,
                       allUsers: usersDatabase };
  console.log(templateVars);
  res.render("urls_index", templateVars);
});


//Page where user can add a new URL
app.get("/urls/new", (req, res) => {
  let templateVars = { urls: urlDatabase,
                       user_id: req.session.user_id,
                       allUsers: usersDatabase };
  res.render("urls_new", templateVars);
});

//Redirects all tinyURLS to their corresponding longURL links
app.get("/u/:shortURL", (req, res) => {

  let longURL = urlDatabase[req.params.shortURL];        //redirects to the same webpage he is in (home)
  if (urlDatabase.hasOwnProperty(req.params.shortURL)) {  //if user imputs nonexistent tinyURL,
    res.redirect(longURL);
  } else {
    res.redirect("/urls")
  }
});

//Registration page
app.get("/register", (req, res) => {
  res.render("users_register");
});

//Login page
app.get("/login", (req, res) => {
  res.render("user_login");
});

//Registers new email and password to the local object database
app.post("/register", (req, res) => {
  let existingEmail = resolveEmail(req.body.email);

  if (existingEmail) {
    res.status(400).send('This email already exists');
  } else if (!req.body.email) {
    res.status(400).send('Please type in an email');
  } else {
    let nonHashed = req.body.password;
    let hashedPassword = bcrypt.hashSync(nonHashed, 10);
    let userID = generateRandomString();
    req.session.user_id = userID;

    usersDatabase[userID] = {id: userID,
                             email: req.body.email,
                             password: hashedPassword,
                             links: {} };   //Object where user-specific links are stored

    res.redirect("/");
  }
});

//Logs person out
app.post("/logout", (req, res) => {
  req.session.user_id = null;
  res.redirect("/");
});

//Accepts a login post
app.post("/login", (req, res) => {
  let tryEmail = req.body.email;
  let tryPassword = req.body.password;
  let userId = confirmLogIn(tryEmail, tryPassword);

  if (!userId) {
    res.status(403).send('Wrong email or password');
  } else {
    req.session.user_id = userId;
    res.redirect("/");
  }

});

//Deletes selected tinyURL along with its corresponding URL
app.post("/urls/:id/delete", (req, res) => {
  let userIdCookie = req.session.user_id;
  delete urlDatabase[req.params.id];                        //Deletes link in urlDatabase (where all URLs are, but are not bound to the users)
  delete usersDatabase[userIdCookie].links[req.params.id];  //Deletes link in usersDatabase (where user-specific links are)
  res.redirect("/urls");
});

//Updates/changes URL to which tinyURL points to
app.post("/urls/:tinyURL", (req, res) => {
    let userIdCookie = req.session.user_id;
  urlDatabase[req.params.tinyURL] = req.body.newURL;                        //Updates link in urlDatabase (where all URLs are, but are not bound to the users)
  usersDatabase[userIdCookie].links[req.params.tinyURL] = req.body.newURL;  //Updates link in usersDatabase (where user-specific links are)
  res.redirect("/urls");
});


//Adds a new link along with new tinyURL
app.post("/urls", (req, res) => {

  let currentUserCookie = req.session.user_id;
  let exitstingShortURL = resolveLongURL(req.body.longURL, currentUserCookie);
  if (exitstingShortURL) {
    res.redirect(`/urls/${exitstingShortURL}`)
  } else {
    let newShortURL = generateRandomString();
    urlDatabase[newShortURL] = req.body.longURL;
    usersDatabase[currentUserCookie].links[newShortURL] = req.body.longURL;
    res.redirect(`/urls/${newShortURL}`);
  }
});

// Takes user to URL updating page
app.get("/urls/:id", (req, res) => {
  let templateVars = { shortURL: req.params.id,
                       longURL: urlDatabase[req.params.id],
                       user_id: req.session.user_id,
                       allUsers: usersDatabase}

  res.render("urls_show", templateVars);
});


app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});