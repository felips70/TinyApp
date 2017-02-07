const express = require("express");
const app = express();
const PORT = process.env.PORT || 8080; //default port 8080
const bodyParser = require("body-parser");
const bcrypt = require('bcrypt');
const cookieSession = require('cookie-session');

app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");

let urlDatabase = {}; //All URL links made by all users

let usersDatabase = {}; //userId, email, password and user-specific specific links. Defined in user registration app.post

app.use(cookieSession({
  name: "session",
  secret: "somesecret"
}));

//Checks wether given URL is already in urlDatabase
function resolveLongURL (longURL, userId) {
  let userLinks = usersDatabase[userId].links;

  for (let tinyURL in userLinks) {
    if (userLinks[tinyURL] === longURL) {
      return tinyURL;
    }
  }
  return null;
}

//Checks wether given email is already in usersDatabase
function resolveEmail (email) {
  for (let userId in usersDatabase) {
    if (usersDatabase[userId].email === email) {
      return email;
    }
  }
  return null;
}

//If given email and password, if exist in usersDatabase returns corresponding user_id, takes into account hashing passwords
function getUserId (email, password) {
  for (let userId in usersDatabase) {
    let currUserEmail = usersDatabase[userId].email;
    let hashedPassword = usersDatabase[userId].password;
    if (email === currUserEmail && bcrypt.compareSync(password, hashedPassword)) {
      return usersDatabase[userId].id;
    }
  }
  return null;
}

//Makes templateVars available to GET requests given req and res
function getTemplateVars (req, res, tinyURL) {
  let urlId = tinyURL ? tinyURL : null;
  let userId;
  let userLinks;
  let userEmail;
  if (req.session.user_id) {
    userId = req.session.user_id;
    userLinks = usersDatabase[userId].links;
    userEmail = usersDatabase[userId].email;
  }

  let templateVars = {
    urls: urlDatabase,
    user_id: req.session.user_id,
    userLinks: userLinks,
    userEmail: userEmail,
    urlId: urlId
  };
  return templateVars;
}

function generateRandomString() {
  return Math.floor((1 + Math.random()) * 0x1000000).toString(16).substring(1);
}

//Root, redirects to /urls
app.get("/", (req, res) => {
  res.redirect("/urls");
});

//Main page where all links are displayed
app.get("/urls", (req, res) => {
  let templateVars = getTemplateVars(req, res);

  res.render("urls_index", templateVars);
});


//Page where user can add a new URL
app.get("/urls/new", (req, res) => {
  if (req.session.user_id) {
    let templateVars = getTemplateVars(req, res);

    res.render("urls_new", templateVars);
  } else {
    res.status(400).send("You have to be logged in to create new links!")
  }
});

//Redirects all tinyURLS to their corresponding longURL links
app.get("/u/:tinyURL", (req, res) => {
  let longURL = urlDatabase[req.params.tinyURL];        //redirects to the same webpage he is in (home)
  if (urlDatabase.hasOwnProperty(req.params.tinyURL)) {  //if user imputs nonexistent tinyURL,
    res.redirect(longURL);
  } else {
    res.status(404).send('This link has not been created');
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

//Registers new email and password to the local database object
app.post("/register", (req, res) => {
  let existingEmail = resolveEmail(req.body.email);

  if (existingEmail) {
    res.status(400).send('This email already exists');
  } else if (!req.body.email) {
    res.status(400).send('Please type in an email');
  } else {
    let nonHashed = req.body.password;
    let hashedPassword = bcrypt.hashSync(nonHashed, 10);
    let userId = generateRandomString();
    req.session.user_id = userId;

    usersDatabase[userId] = {
      id: userId,
      email: req.body.email,
      password: hashedPassword,
      links: {} //Object where user-specific links are stored
    };
    res.redirect("/");
  }
});

//Logs person out
app.post("/logout", (req, res) => {
  delete req.session.user_id;
  res.redirect("/");
});

//Accepts a login post
app.post("/login", (req, res) => {
  let tryEmail = req.body.email;
  let tryPassword = req.body.password;
  let userId = getUserId(tryEmail, tryPassword);
  if (!userId) {
    res.status(403).send('Wrong email or password');
  } else {
    req.session.user_id = userId;
    res.redirect("/");
  }

});

//Deletes selected tinyURL along with its corresponding URL
app.post("/urls/:tinyURL/delete", (req, res) => {
    if (req.session.user_id) {
      let userIdCookie = req.session.user_id;
      delete urlDatabase[req.params.tinyURL];                        //Deletes link in urlDatabase (where all URLs are, but are not bound to the users)
      delete usersDatabase[userIdCookie].links[req.params.tinyURL];  //Deletes link in usersDatabase (where user-specific links are)
      res.redirect("/urls");
  } else {
      res.status(400).send("You have to be logged in to delete links!")
  }
});

//Updates/changes URL to which tinyURL points to
app.post("/urls/:tinyURL", (req, res) => {
    let userIdCookie = req.session.user_id;
  if (userIdCookie) {
    if (!urlDatabase[req.params.tinyURL]) {
      res.status(404).send('This link does not exist in the database');
    } else {
      urlDatabase[req.params.tinyURL] = req.body.newURL;                        //Updates link in urlDatabase (where all URLs are, but are not bound to the users)
      usersDatabase[userIdCookie].links[req.params.tinyURL] = req.body.newURL;  //Updates link in usersDatabase (where user-specific links are)
      res.redirect("/urls");
    }
  } else {
    res.status(400).send("You have to be logged in to update links!")
  }
});


//Adds a new link along with new tinyURL
app.post("/urls", (req, res) => {

  let currentUserId = req.session.user_id;
  let exitstingShortURL = resolveLongURL(req.body.longURL, currentUserId);
  if (exitstingShortURL) {
    res.redirect(`/urls/${exitstingShortURL}`)
  } else {
    let newLongURL = '';
    let newShortURL = generateRandomString();
    req.body.longURL.slice(0,7) === 'http://' ? newLongURL = req.body.longURL : newLongURL = 'http://' + req.body.longURL;
    urlDatabase[newShortURL] = newLongURL;
    usersDatabase[currentUserId].links[newShortURL] = newLongURL;
    res.redirect(`/urls/${newShortURL}`);
  }
});

// Takes user to URL updating page
app.get("/urls/:tinyURL", (req, res) => {
  let userIdCookie = req.session.user_id;
  if (!userIdCookie) {
      res.status(401).send('You have to be logged in to edit links');
  } else {
    let templateVars = getTemplateVars(req, res, req.params.tinyURL);

    res.render("urls_show", templateVars);
  }
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});