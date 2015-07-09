/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';
var express = require('express');
var app = express();
var bluemix = require('./config/bluemix');
var watson = require('watson-developer-cloud');
var extend = require('util')._extend;
var striptags = require('striptags');
var Request = require('request');

// Bootstrap application settings
require('./config/express')(app);

// if bluemix credentials exists, then override local
var credentials = extend({
  version: 'v2',
  username: '4e6b0d01-cc42-480d-8f4b-a411632e759e',
  password: 'meq1DxFNpzFn'
}, bluemix.getServiceCreds('personality_insights')); // VCAP_SERVICES

// Create the service wrapper
var personalityInsights = watson.personality_insights(credentials);

// render index page
app.get('/', function (req, res) {
  res.render('index');
});

// 1. Check if we have a captcha and reset the limit
// 2. pass the request to the rate limit
app.post('/analyze', function (req, res, next) {
  personalityInsights.profile(req.body, function (err, profile) {
    if (err)
      return next(err);
    else
      return res.json(profile);
  });
});

// Request the landing page URL, strip HTML tags, and gather insights using Watson
app.post('/fetch', function (req, res, next) {
  var landingPageUrl = req.body.url;
  if (landingPageUrl.indexOf('http') === -1) {
    landingPageUrl = 'http://' + landingPageUrl;
  }
  Request(landingPageUrl, function (err, response, body) {
    if (!err && response.statusCode == 200) {
      var siteText = striptags(body);
      personalityInsights.profile({text: siteText}, function (error, result) {
        if (error || result === null) {
          next(error);
        } else {
          res.send(result);
        }
      });
    } else {
      res.send(err);
    }
  });
});

// error-handler settings
require('./config/error-handler')(app);

var port = process.env.VCAP_APP_PORT || 3000;
app.listen(port);
console.log('listening at:', port);
