// Dependencies
var express = require("express");
var mongojs = require("mongojs");
var axios = require("axios");
var cheerio = require("cheerio");
var exphbs = require("express-handlebars");
var mongoose = require("mongoose");

// Initialize Express
var app = express();
var PORT = process.env.PORT || 3000;

// Database configuration
var databaseUrl = "scraper";
var collections = ["players", "news"];

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static("public"));

// Hook mongojs configuration to the db variable
var db = mongojs(databaseUrl, collections);
db.on("error", function (error) {
    console.log("Database Error:", error);
});

const data = require("./config/keys").mongoURI;

mongoose
    .connect(db, { useNewUrlParser: true })
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));


// Main route
app.get("/", function (req, res) {
    res.send("Hello world");
});

// Retrieve data from the db
app.get("/all", function (req, res) {
    db.baseball.find({}, function (error, found) {
        if (error) {
            console.log(error);
        } else {
            res.json(found);
        }
    });
});

// Scrape data from one site and place it into the mongodb db
app.get("/scrape", function (req, res) {
    // Make a request via axios for the news section of `ycombinator`
    axios.get("https://www.mlb.com/news").then(function (response) {
        // Load the html body from axios into cheerio
        var $ = cheerio.load(response.data);
        // For each element with a "title" class
        $(".p-headline-stack__link").each(function (i, element) {
            // Save the text and href of each link enclosed in the current element
            var link = $(element)
                .children("h2")
                .children("a")
                .attr("href");
            var title = $(element)
                .children("span")
                .children("a")
                .text();
            var date = $(element)
                .children("span")
                .text()
                .split("/n")[1]
                .trim();
            var author = $(element)
                .children("span")
                .children("span")
                .text();

            // If this found element had both a title and a link
            if (title && link && date && author) {
                db.baseball.insert({
                    title,
                    link,
                    date,
                    author
                },
                    function (err, inserted) {
                        if (err) {
                            // Log the error if one is encountered during the query
                            console.log(err);
                        }
                        else {
                            // Otherwise, log the inserted data
                            console.log(inserted);
                        }
                    });
            }
        });
    });

    // Send a "Scrape Complete" message to the browser
    res.send();
});


// Listen on port 3000
app.listen(PORT, function () {
    console.log("App running on port: ", PORT);
});
