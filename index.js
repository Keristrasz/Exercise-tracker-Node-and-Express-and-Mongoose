const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
let bodyParser = require("body-parser")
let mongoose = require("mongoose");
const { Schema, model } = mongoose; //const Schema = mongoose.Schema;, same for model
mongoose.set('useFindAndModify', false)
app.use(bodyParser.urlencoded({ extended: false }))

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// # 1 Install and Set Up Mongoose, 
// with using MONGO_URI="mongodb+srv://keristrasz:<password>@cluster0.de1ntjl.mongodb.net/?retryWrites=true&w=majority" in the .env file, or secret tab (for replit)


mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
  console.log('Database connection successful')
})
  .catch(err => {
    console.error('Database connection error')
  })

//  Create a Model (added const { Schema,  model } = mongoose;)
// making blueprint - schema for creating a user

const userSchema = new Schema({
  username: {
    type: String,
    required: true
  },
  count: Number,
  log: [{
    description: String,
    duration: Number,
    date: { type: String, required: false },
    _id: false
  }]
});

const User = mongoose.model("User", userSchema);

// You can POST to /api/users with form data username to create a new user.
// The returned response from POST /api/users with form data username will be an object with username and _id properties.

app.post("/api/users", async (req, res) => {
  let createUser = await User.create({
    username: req.body.username,
  }).then(user => {
    res.send({ username: user.username, _id: user._id });
    console.log("User" + user + " created");
  })
    .catch(err => {
      console.error(err, "User NOT saved");
    });
})


// You can make a GET request to /api/users to get a list of all users.

app.get("/api/users", async (req, res) => {
  let allUsers = await User.find();   //finds all users in DB
  res.send(allUsers);    //Its already json, but we can use json
})

// You can POST to /api/users/:_id/exercises with form data description, duration, and optionally date. If no date is supplied, the current date will be used.


app.post("/api/users/:_id/exercises", (req, res) => {
  let exercise = {    //input
    description: req.body.description,
    duration: parseInt(req.body.duration),
    date: new Date(req.body.date).toDateString()
  };
  if (exercise.date === "Invalid Date") {    //if date is not inputed, makes  new date today
    exercise.date = new Date().toDateString()
  }
  User.findOneAndUpdate({ _id: req.params._id }, exercise, { new: true }, (err, updatedUser) => {
    if (err) {
      res.send({
        error: err
      })
    }
    else {
      updatedUser.log.push(exercise);  //pushes new log into object of arrays key - user.logs
      updatedUser.save();
      res.send({
        username: updatedUser.username,
        _id: req.params._id,
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date
      })
      console.log("Excerised saved");
    }
  })
});

// You can make a GET request to /api/users/:_id/logs to retrieve a full exercise log of any user.
// A request to a user's log GET /api/users/:_id/logs returns a user object with a count property representing the number of exercises that belong to that user.
// A GET request to /api/users/:_id/logs will return the user object with a log array of all the exercises added.
// Each item in the log array that is returned from GET /api/users/:_id/logs is an object that should have a description, duration, and date properties.

app.get("/api/users/:_id/logs", (req, res) => {  //we can use async and await for findbyid
  User.findById(req.params._id, (err, foundUser) => {    //req.params._id is to find the user in same path as DB
    if (err) { return console.log(err) };
    console.log(foundUser);
    if (req.query.from || req.query.to || req.query.limit) {     //executes if queries exist, then its limited by time - from and to, and count - limit (https://boilerplate-project-exercisetracker.kareljek.repl.co/api/users/63a5d9ef326e04057d25feef/logs?from=1996-12-12&to=2000-12-12&limit=3)
      let from = new Date(req.query.from);
      let to = new Date(req.query.to);
      let outputLog = foundUser.log;
      if (req.query.from && !req.query.to) {  //if only ?from=1995-10-10 exists
        outputLog = foundUser.log.filter(log =>
          new Date(log.date) >= from
        )
      }
      else if (!req.query.from && req.query.to) {    //if only ?to=1995-10-10 exists
        outputLog = foundUser.log.filter(log =>
          new Date(log.date) <= to
        )
      }
      else if (req.query.from && req.query.to) {  //if both from and to exists
        outputLog = foundUser.log.filter(log =>
          new Date(log.date) >= from && new Date(log.date) <= to
        )
      }
      if (req.query.limit && foundUser.log.length > req.query.limit) {      //if limit query exists (and its bigger than logs.length)
        outputLog.splice(req.query.limit, foundUser.log.length - req.query.limit);
      }
      res.send({
        log: outputLog,
        count: outputLog.length,
      })
    } else {      //if no query exsists, it sends all found logs, annd logs.length
      res.send({
        log: foundUser.log,
        count: foundUser.log.length,
      })
    }
  });
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
