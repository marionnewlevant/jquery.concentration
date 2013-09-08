// follows http://www.learningjquery.com/2007/10/a-plugin-development-pattern

// concentration cardgame plugin

//
// create closure
//
(function ($) {
// private functions

/* Fisher-Yates in place shuffle */
function shuffle(myArray) {
  var i = myArray.length;
  var j, temp;
  if (i === 0) { return false; }
  while (--i) {
     j = Math.floor(Math.random() * (i + 1));
     temp = myArray[i];
     myArray[i] = myArray[j];
     myArray[j] = temp;
   }
}

/*
Grab the next card from the queue of cards to be flipped,
flip it, and then call ourselves recursively to do it again.
Terminates when flips queue is empty.
*/
function doFlip($game) {
  var gameData = $game.data('data');
  var flip;
  var $card, $up, $down;
  if (gameData.flips.length === 0) {
    gameData.isFlipHandlerRunning = false;
    return;
  }
  flip = gameData.flips.shift();
  switch (flip.action) {
  case 'flip':
    $card = flip.card;
    $up = $card.find('.jqConcentrationUp');
    $down = $card.find('img').not('.jqConcentrationUp');
    $up.addClass('jqConcentrationUp-last');
    $down.css({opacity: 0.0}).
      addClass('jqConcentrationUp').
      animate({opacity: 1.0}, flip.time, function () {
        $up.removeClass('jqConcentrationUp jqConcentrationUp-last');
        doFlip($game);
      });
    break;
  case 'pause':
    window.setTimeout(function () { doFlip($game); }, flip.time);
    break;
  default: doFlip($game); // better luck w/ next action
  }
}

/*
Set isFlipHandlerRunning, and start flipping. Does nothing
if isFlipHandlerRunning was already true.
*/
function flipHandler($game){
  var gameData = $game.data('data');
  if (gameData.isFlipHandlerRunning === true) { return; }
  gameData.isFlipHandlerRunning = true;
  doFlip($game);
}

/* boolean: do these 2 cards match? */
function isMatching($c1, $c2) {
  return $c1.find('img:first').attr('src') ===
    $c2.find('img:first').attr('src');
}

/*
Handle click events from the clicks queue.
First, ignore illegal clicks (click on matched card, click on
turned card). Then, flip the card. Then, if this is 2nd card,
and the two match, mark them matched. Otherwise, flip them both
back. If this is first card, just remember it is the flippedCard.
Cards are flipped by putting them on the flips queue.
After all clicks are handled, call the flipHandler.
*/
function clickHandler($game) {
  var gameData = $game.data('data');
  var event;
  var $card; // card clicked on
  var $prevFlipped;
  if (gameData.isClickHandlerRunning === true) { return; }
  gameData.isClickHandlerRunning = true;
  while (gameData.clicks.length > 0) {
    event = gameData.clicks.shift();
    $card = $(event.target).parent();
    if ($card.hasClass('jqConcentrationMatched')) { continue; }
    $prevFlipped = gameData.$flippedCard;
    // note: no easy way to compare 2 jQuery objects for equality.
    if ($prevFlipped && $card.data('data').index === $prevFlipped.data('data').index) { continue; }
    gameData.flips.push({
      action: 'flip',
      card: $card,
      time: gameData.faceUpTime
    });
    if ($prevFlipped !== null) { // 2nd one now
      if (isMatching($card, $prevFlipped)) { // got a match, leave them face up
        $card.addClass('jqConcentrationMatched');
        $prevFlipped.addClass('jqConcentrationMatched');
      } else { // they didn't match
        // wait a bit, then turn cards back over
        gameData.flips.push({
          action: 'pause',
          time: gameData.pauseTime
        });
        gameData.flips.push({
          action: 'flip',
          card: $prevFlipped,
          time: gameData.faceDownTime
        });
        gameData.flips.push({
          action: 'flip',
          card: $card,
          time: gameData.faceDownTime
        });
      }
      gameData.$flippedCard = null;
    } else {
      gameData.$flippedCard = $card;
    }
  }
  gameData.isClickHandlerRunning = false;
  flipHandler($game);
}

//
// plugin definition
//
$.fn.concentration = function (options) {
  // 'this' is jq collection
  // options: {fronts: [img], back: img, pairs: num, columns: num}
  var opts = $.extend({}, $.fn.concentration.defaults, options);
  opts.pairs = Math.min(opts.fronts.length, opts.pairs);
  // iterate and reformat each matched element
  return this.each(function () {
    // 'this' is single dom element (div usually) where the game sits
    var $this = $(this);
    var fronts; // array of img for card fronts. 2 of each, shuffled
    var $table = $('<table class="jqConcentrationTable"></table'); // layout table in game div
    var $row; // current row of table
    // game data
    $this.data('data', {
      clicks: [], // queue of click events
      flips: [], // queue of cards to be flipped
      isClickHandlerRunning: false, // mutex for clickHandler
      isFlipHandlerRunning: false, // mutex for flipHandler
      $flippedCard: null, // face up card
      faceUpTime: opts.faceUpTime, // delay for turning card up
      faceDownTime: opts.faceDownTime, // delay when turning card down
      pauseTime: opts.pauseTime
    });
    shuffle(opts.fronts);
    fronts = $.merge(opts.fronts.slice(0, opts.pairs), opts.fronts.slice(0, opts.pairs));
    shuffle(fronts);
    $this.empty().append($table);
    $.map(fronts, function (elem, index) { // foreach card
      var $back = $('<img src="' + opts.back + '" class="jqConcentrationUp">');
      var $card = $('<div class="jqConcentrationCard"></div>');
      // card data
      $card.data('data', {
        index: index
      });
      $card.append($('<img src="' + elem + '"/>')).append($back);
      if (index % opts.columns === 0) { // start a new row
        $row = $('<tr></tr>');
        $table.append($row);
      }
      $row.append($('<td></td>').append($card));
    });
    // click handler for the game div. Just queue the click and return.
    $this.click(function (event) {
      if ($(event.target).is('img')) {
        $this.data('data').clicks.push(event);
        clickHandler($this);
      }
    });
  });
};

//
// predefined plugin options
//
$.fn.concentration.defaults = {
  // fronts: [img urls], - required array of front of card image urls, 100x100px
  // back: img url, - required url of back of card image. 100x100px
  pairs: 8, // number of pairs. 8 pairs means 16 cards to match
  columns: 4, // number of columns in layout table
  faceUpTime: 0, // time to turn face up
  faceDownTime: 1000, // time to turn face down (miliseconds)
  pauseTime: 500 // pause before reverting mismatched cards
};

//
// end of closure
//
})(jQuery);
