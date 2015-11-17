/**
 * Builds a Quiz (for display on display.html)
 * from OpenLearning setup data, which checks
 * and stores the answers for the current user.
 */

// constants
var DEFAULT_ANSWER_DATA = [{'id': '1', 'text': 'Answer 1'}, {'id': '2', 'text': 'Answer 2'}];
var DEFAULT_ANSWER_TYPE = 'single'; // 'single' or 'multiple'

// global state: the selected state of the quiz
var state;

/**
 * Handles the submission of the quiz to trigger
 * the saving and checking of the state.
 */
var submitQuizHandler = function(callback) {
    var $status = $('.status');

    /* Update the state data object from the UI state */
    $('.answer-item').each(function(i, elt) {
        var $item = $(elt);
        // set the state of this item in the state data
        state[$item.val()] = $item.prop('checked');
    });

    console.log(state);

    /* Update the user's saved state data: */

    // change the status element to have a "saving" look
    // while it's saving
    $status.addClass('saving');

    // submit an object of all item states e.g. 
    /*
        {
            'item-id-1': true,
            'item-id-2': false
        }
      to compare against the completion criteria
      (to update the user's progress)
    */
    OL.user.submit(state, function(result) {
        // Check "success"
        // (as in all the answers matched correctly)
        // then show/hide elements accordingly
        $('.correct').toggle(result.success);
        $('.incorrect').toggle(!result.success);

        console.log(result);

        // tell OpenLearning to replace the "selected" data for the user 
        // with the current state, and if it was correct
        OL.user.replace({'selected': state, 'isCorrect': result.success}, function() {
            // it's done all saving operations, so remove the 
            // "saving" look of the status element
            $status.removeClass('saving');
            if (callback) {
                callback();
            }
        });
    });
    
    // tell OpenLearning that there was some kind of interaction
    // (for analytics and completion data)
    OL.user.logInteraction();
};

/**
 * Randomly shuffles an array (in-place)
 * 
 * @param  {array} array - The array to shuffle.
 */
var shuffle = function(array) {
    var selected, temp;
    var i = array.length;
    while (i) {
        selected = Math.floor(Math.random() * i);
        i--;

        temp = array[i];
        array[i] = array[selected];
        array[selected] = temp;
    }
};

/**
 * Builds the DOM elements for the quiz answers, adds event handlers,
 * and inserts them into the given container
 * 
 * @param  {jQuery} $container - The jQuery-wrapped DOM element containing the answers
 * @param  {string} type Either - "single" or "multiple", depending on whether multiple selection (checkboxes) is required
 * @param  {array} answers - An array of answer objects (with "id" and "text" properties) to display
 */
var buildAnswers = function($container, type, answers) {
    var itemStyle, itemName;

    if (type === 'multiple') {
        itemStyle = 'checkbox';
    } else if (type === 'single') {
        itemStyle = 'radio';
    } else {
        throw {
            message: "Not Implemented: " + type
        };
    }

    if (type === 'single' || type === 'multiple') {
        // build the answers

        itemName = 'answer';

        $.each(answers, function(i, item) {
            if (type === 'multiple') {
                itemName = item.id;
            }

            // build the label and input element for the answer
            var $label = $('<label>')
                .append(
                    $('<input>', {
                        'type': itemStyle,
                        'class': 'answer-item',
                        'name': itemName,
                        'value': item.id
                    }).prop('checked', Boolean(state[item.id]))
                )
            ;

            // add the appropriate elements for the item's style
            if (itemStyle === 'checkbox') {
                $label
                    .append(
                        $('<span>', {'class': 'checkbox-material'})
                            .append($('<span>', {'class': 'check'}))
                    )
                ;
            } else {
                $label
                    .append(
                        $('<span>', {'class': 'circle'})
                    )
                    .append(
                        $('<span>', {'class': 'check'})
                    )
                ;
            }

            // add the answer text to this item
            $label.append(
                $('<div>', {'class': 'item-text'}).text(item.text)
            );

            var $item = $('<div>')
                .addClass(itemStyle)
                .addClass(itemStyle + '-primary')
                .append($label)
            ;

            $container.append($item);
        });
    }
};

/**
 * Initialise the widget when the OL API becomes available.
 */
OL(function() {
    // initialise material design styles
    $.material.init();

    // the jQuery content container in the DOM
    var $container = $('#content');

    // the answers (setup data)
    var answers = OL.setup.data.answers || DEFAULT_ANSWER_DATA;
    // the type of answer (setup data)
    var type    = OL.setup.data.type    || DEFAULT_ANSWER_TYPE;

    // the selected state for the user (user data)
    state = OL.user.data.selected || {};

    // hide, then set the correct/incorrect text to that specified in the setup data
    $('.correct-message')
        .hide()
        .text(OL.setup.data.correctMessage   || '')
    ;
    $('.incorrect-message')
        .hide()
        .text(OL.setup.data.incorrectMessage || '')
    ;

    // if the user has previously answered correctly
    // display "correct" status
    if (OL.user.data.isCorrect) {
        $('.correct').show();
    }

    // if the answers have been set up to be shuffled, shuffle them
    if (OL.setup.data.isShuffled) {
        shuffle(answers);
    }
    
    // build the answers as HTML elements
    buildAnswers($container, type, answers);

    $('#check-answer-btn').on('click', function() {
        var $this = $(this);
        $this.prop('disabled', true);
        submitQuizHandler(function() {
            $this.prop('disabled', false);
        });
    });
});
