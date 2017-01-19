const express = require("express");
const app = express();
const PORT = process.env.PORT || 8080; // default port 8080
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));

app.set("view engine", "ejs");

let urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

function resolveLongURL (longURL) {
  for (let tinyURL in urlDatabase) {
    if (urlDatabase[tinyURL] === longURL) {
      return tinyURL;
    }
  }
}


function generateRandomString() {
  return Math.floor((1 + Math.random()) * 0x1000000).toString(16).substring(1);
}

app.get("/urls", (req, res) => {
  res.render("urls_index", { urls: urlDatabase });
});

app.get("/urls/new", (req, res) => {
  res.render("urls_new");
});


app.get("/u/:shortURL", (req, res) => {

  if (urlDatabase.hasOwnProperty(req.params.shortURL)) {  //if user imputs nonexistent tinyURL,
   let longURL = urlDatabase[req.params.shortURL];        //redirects to the same webpage he is in (home)
  res.redirect(longURL);
  } else {
    res.redirect("/urls")
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
  res.redirect(`/urls/${newShortURL}`)
  }
});

// Takes user to URL updating page
app.get("/urls/:id", (req, res) => {
  res.render("urls_show", { shortURL: req.params.id,
                            longURL: urlDatabase[req.params.id]});
});


app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

