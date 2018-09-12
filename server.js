'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
let dns = require('dns');
let bodyParser = require('body-parser');

var cors = require('cors');

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Basic Configuration 
var port = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URI);

app.use(cors());

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

let counterSchema = new mongoose.Schema({
  count: {type: Number, default: 1}
});

let Counter = mongoose.model('Counter', counterSchema);

let urlSchema = new mongoose.Schema({
  url: String,
  count: Number
});

let Url = mongoose.model('Url', urlSchema);

let getNextCount = (req, res, cb) => {
  Counter.findOneAndUpdate({}, {$inc:{'count': 1}}, (err, data) => {
    if (err) return;
    if (data) {
      cb(data.count);
    } else {
      let newCounter = new Counter();
      newCounter.save((err) => {
        if (err) return;
        Counter.findOneAndUpdate({}, {$inc:{'count': 1}}, (err, data) => {
          if (err) return;
          cb(data.count);
        });
      });
    }
  });
}

app.post('/api/shorturl/new', (req, res) => {
  let url = req.body.url;
  let testUrl = url.slice(url.indexOf('//') + 2);
  dns.lookup(testUrl, (err) => {
    if (err) {
      res.json({error:'invalid URL'});
    } else {
      Url.findOne({url: url}, (err, storedUrl) => {
        if (err) return;
        if (storedUrl) {
          res.json({original_url: url, short_url: storedUrl.count});
        } else {
          getNextCount(req, res, (countInput) => {
            let newEntry = new Url({
              url: url,
              count: countInput
            });
            newEntry.save((err) => {
              if (err) return;
              res.json({original_url: url, short_url: countInput});
            });
          });
        }
      });
    }
  });
});

app.get('/api/shorturl/:urlCount', (req, res) => {
  let urlCount = req.params.urlCount;
  if (!parseInt(urlCount, 10)) {
    res.json({error: 'Shortcut should be an integer'}); 
    return;
  } else {
    Url.findOne({count: urlCount}, (err, data) => {
      if (err) return;
      if (data) {
        res.redirect(data.url);
      } else {
        res.json({error: 'There is no url stored under that integer'}); 
      }
    });
  }
});

app.listen(port, function () {
  console.log('Node.js listening ...');
});