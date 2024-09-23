const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
mongoose.connect(process.env.DATABASE_CONNECTION_STRING);

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const usernameSchema = new mongoose.Schema ({
  username: String
});

const Username = mongoose.model('Username', usernameSchema);

const exerciseSchema = new mongoose.Schema ({
  userId: String,
  description: String,
  duration: Number,
  date: String
});

const Exercise = mongoose.model('Exercise', exerciseSchema);

const findUser = async userId => {
  try {
    return await Username.findById(userId);
  }
  catch (err) {
    console.error("Error finding username:", err);
    throw err;
  }  
}

app.use('/api/users', bodyParser.urlencoded({extended: false}));

app.get('/api/users', (req, res) => {
  (async () => {
    return await Username.find();
  })().then(data => {
    res.json(data);
  })
})

app.post('/api/users', (req, res) => {
  console.log(">>>Input username:", req.body.username);
  //create username in database
  (async () => {
    try {
      return await Username.create({username: req.body.username});
    }
    catch (err) {
      console.error("Error creating username document:", err);
      throw err;
    }
  })().then(doc => {
      console.log("username document created in database:", doc);
      res.json({username: doc.username, _id: doc._id});
    })
})

app.post('/api/users/:_id/exercises', (req, res) => {
  //find the username for the input _id
  findUser(req.params._id).then(user => {
    console.log("username document found:", user);
    let date = new Date();
    if (req.body.date) { date = new Date(req.body.date); }
    console.log("date:", date);
    //create exercise in database
    (async () => {
      try {
        return await Exercise.create({
          userId: user._id,
          description: req.body.description,
          duration: req.body.duration,
          date: date.toDateString()
        });
      }
      catch (err) {
        console.log("Error creating exercise document:", err);
        throw err;
      }
    })().then(doc => {
      console.log("exercise document created in database:", doc);
      res.json({_id: doc.userId, username: user.username, description: doc.description, duration: doc.duration, date: doc.date});
    })
  })
})

app.get('/api/users/:_id/logs', (req, res) => {
  console.log("From:", req.query.from, "| To:", req.query.to, "| Limit:", req.query.limit);
  //find the username for the input _id
  findUser(req.params._id).then(user => {
    console.log("User found:", user);
    //find the relevant exercises
    (async () => {
      try {
        return await Exercise
          .find({userId: req.params._id})
      }
      catch (err) {
        console.error("Error finding exercise(s):", err);
        throw err;
      }
    })().then(exercises => {
      //if 'from' and/or 'to' query params are specified, only keep exercises relevant to them
      const filteredExercises = exercises.filter(exercise => {
        if (new Date(exercise.date) >= (new Date(req.query.from || 0)) 
            && new Date(exercise.date) <= (new Date(req.query.to || 8640000000000000))) {
          return true;
        } else return false;
      })
      const mappedExercises = filteredExercises.map(exercise => { return {
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date
      }}).slice(0, req.query.limit); //only keep a limited number of exerices
      console.log("mappedExercises:", mappedExercises);
      res.json({_id: user._id, username: user.username, count: mappedExercises.length, log: mappedExercises});
    })
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
