/**
 * Builds a Quiz Answer Setup (authoring tool) (for display on setup.html)
 * loads and saves answers from/to OpenLearning setup data, and sets up
 * criteria for checking off against the correct selection.
 */

// constants
var DEFAULT_ANSWER_DATA = [{'id': '1', 'text': 'Answer 1'}, {'id': '2', 'text': 'Answer 2'}];
var DEFAULT_ANSWER_TYPE = 'single'; // 'single' or 'multiple'
var DEFAULT_CORRECT_SELECTION = {'1': true, '2': false};

/*
    global state:
      * the quiz answers
      * the type of quiz (single or multiple selection)
      * the correct selection of quiz answers (mapping answer IDs to booleans)
*/
var answers, type, correctSelection;


var deleteAnswer = function(answerID) {

};

var saveAnswers = function(callback) {
    OL.setup.replace({
        'answers': answers,
        'type': type
    }, function(result) {
        answers = result.data.answers;
        type    = result.data.type;
        callback();
    });
};

var saveCriteria = function(callback) {
    OL.criteria.replace(correctSelection, function() {
        callback();
    });
};

var save = function(callback) {
    var calls = 0;

    // save answers and criteria in parallel
    // and fire the callback when they're both done (in any order)

    calls++;
    saveAnswers(function() {
        (--calls === 0) && callback();
    });

    calls++;
    saveCriteria(function() {
        (--calls === 0) && callback();
    });
};

// helpers
var buildAnswers = function($container) {
    var itemStyle, itemName;

    $container.empty();

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

            var $remove = $('<button>', {'class': 'btn btn-default btn-flat btn-remove'})
                .html('&times;')
                .data('item-id', item.id)
                .click(function() {
                    deleteAnswer($(this).data('item-id'));
                })
            ;

            // build the label and input element for the answer
            var $label = $('<label>')
                .append(
                    $('<input>', {
                        'type': itemStyle,
                        'class': 'answer-item',
                        'name': itemName,
                        'value': item.id
                    }).prop('checked', Boolean(correctSelection[item.id]))
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
            $label
                .append($('<input>', {'class': 'item-text form-control'}).val(item.text))
                .append($remove)
            ;

            var $item = $('<div>')
                .addClass(itemStyle)
                .addClass(itemStyle + '-primary')
                .append($label)
            ;

            $container.append($item);
            $item.find('input').on('click', function() {
                // update the correct selection data from the selected items
                $('.answer-item').each(function(i, elt) {
                    var $item = $(elt);
                    correctSelection[$item.val()] = $item.prop('checked');
                });

                // save the data
                $status.addClass('saving');
                saveCriteria(function() {
                    $status.removeClass('saving');
                });
            });
        });
    }
};


// init
OL(function() {
    $.material.init();

    // the jQuery content container in the DOM
    var $container = $('#content');

    // the answers (setup data)
    answers = OL.setup.data.answers || DEFAULT_ANSWER_DATA;
    // the type of answer (setup data)
    type    = OL.setup.data.type    || DEFAULT_ANSWER_TYPE;

    // set the correct/incorrect text to that specified in the setup data
    $('#correct-message-input'  ).val(OL.setup.data.correctMessage   || '');
    $('#incorrect-message-input').val(OL.setup.data.incorrectMessage || '');

    // load the correct selection (criteria data)
    OL.criteria.retrieve(function(result) {
        correctSelection = result.data || DEFAULT_CORRECT_SELECTION;
        // build the answers as HTML elements
        buildAnswers($container);
    });
});
