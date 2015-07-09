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
$(document).ready(function () {

  var widgetId = 'vizcontainer'; // Must match the ID in index.jade
  var widgetWidth = 700;
  var widgetHeight = 700; // Default width and height
  var personImageUrl = 'images/app.png'; // Can be blank

  // Jquery variables
  var $content = $('.content');
  var $loading = $('.loading');
  var $error = $('.error');
  var $errorMsg = $('.errorMsg');
  var $traits = $('.traits');
  var $results = $('.results');
  var $lpcontent = $('.lpcontent');

  /*
   * Clear the "textArea"
   */
  $('.clear-btn').click(function () {
    $('.clear-btn').blur();
    $content.val('');
    updateWordsCount();
  });

  /*
   * Update words count on change
   */
  $content.change(updateWordsCount);

  /*
   * Update words count on copy/past
   */
  $content.bind('paste', function() {
    setTimeout(updateWordsCount, 100);
  });

  function toggleElementsOnAjaxRequest () {
    $loading.show();
    $error.hide();
    $traits.hide();
    $results.hide();
  }

  function ajaxErrorHandler (xhr) {
    $loading.hide();

    var error;
    try {
      error = JSON.parse(xhr.responseText || {});
    } catch(e) {}
    showError(error.error || error);
  }

  // Request handler for fetching a landing page
  $('.landingpage-btn').click(function () {
    toggleElementsOnAjaxRequest();
    $.ajax({
      type: 'POST',
      data: {
        url: $lpcontent.val()
      },
      url: '/fetch',
      dataType: 'json',
      success: function (response) {
        $loading.hide();

        if (response.error) {
          showError(response.error);
        } else {
          $results.show();
          showTraits(response);
          showTextSummary(response);
        }
      },
      error: function (xhr) {
        ajaxErrorHandler(xhr);
      }
    })
  });
  
  // Request handler for pasted text
  $('.analysis-btn').click(function () {
    $('.analysis-btn').blur();
    toggleElementsOnAjaxRequest();
    $.ajax({
      type: 'POST',
      data: {
        text: $content.val()
      },
      url: '/analyze',
      dataType: 'json',
      success: function (response) {
        $loading.hide();

        if (response.error) {
          showError(response.error);
        } else {
          $results.show();
          showTraits(response);
          showTextSummary(response);
        }

      },
      error: function (xhr) {
        ajaxErrorHandler(xhr);
      }
    });
  });

  /**
   * Display an error or a default message
   * @param  {String} error The error
   */
  function showError (error) {
    var defaultErrorMsg = 'Error processing the request, please try again later.';
    $error.show();
    $errorMsg.text(error || defaultErrorMsg);
  }

  /**
   * Displays the traits received from the
   * Personality Insights API in a table,
   * just trait names and values.
   */
  function showTraits (data) {
    $traits.show();

    var traitList = flatten(data.tree);
    var table = $traits;

    table.empty();
    // Header
    $('#header-template').clone().appendTo(table);

    // For each trait
    for (var i = 0; i < traitList.length; i++) {
      var elem = traitList[i];

      var Klass = 'row';
      Klass += (elem.title) ? ' model_title' : ' model_trait';
      Klass += (elem.value === '') ? ' model_name' : '';

      if (elem.value !== '') { // Trait child name
        $('#trait-template').clone()
          .attr('class', Klass)
          .find('.tname')
          .find('span').html(elem.id).end()
          .end()
          .find('.tvalue')
            .find('span').html(elem.value === '' ?  '' : (elem.value + ' (± '+ elem.sampling_error+')'))
            .end()
          .end()
          .appendTo(table);
      } else {
        // Model name
        $('#model-template').clone()
          .attr('class', Klass)
          .find('.col-lg-12')
          .find('span').html(elem.id).end()
          .end()
          .appendTo(table);
      }
    }
  }

  /**
   * Construct a text representation for big5 traits crossing, facets and
   * values.
   */
  function showTextSummary (data) {
    var paragraphs = [
      assembleTraits(data.tree.children[0]),
      assembleFacets(data.tree.children[0]),
      assembleNeeds(data.tree.children[1]),
      assembleValues(data.tree.children[2])
    ];
    var div = $('.summary-div');
    div.empty();
    paragraphs.forEach(function(sentences) {
      $('<p></p>').text(sentences.join(' ')).appendTo(div);
    });
  }

  /*
   * Returns a 'flattened' version of the traits tree, to display it as a list
   * @return array of {id:string, title:boolean, value:string} objects
   */
  function flatten ( /*object*/ tree) {
    var flattenedTree = [];
    var traverse = function (t, level) {
      if (!t) return;
      if (level > 0 && (!t.children || level !== 2)) {
        flattenedTree.push({
          'id': t.name,
          'title': t.children ? true : false,
          'value': (typeof (t.percentage) !== 'undefined') ? Math.floor(t.percentage * 100) + '%' : '',
          'sampling_error': (typeof (t.sampling_error) !== 'undefined') ? Math.floor(t.sampling_error * 100) + '%' : ''
        });
      }
      if (t.children && t.id !== 'sbh') {
        for (var i = 0; i < t.children.length; i++) {
          traverse(t.children[i], level + 1);
        }
      }
    };
    traverse(tree, 0);
    return flattenedTree;
  }

  function updateWordsCount () {
    var text = $content.val();
    var wordsCount = text.match(/\S+/g) ? text.match(/\S+/g).length : 0;
    $('.wordsCount').css('color',wordsCount < 100 ? 'red' : 'gray');
    $('.wordsCount').text(wordsCount + ' words');
  }

  $content.keyup(updateWordsCount);

});
