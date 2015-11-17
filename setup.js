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
    var deleteIndex = null;
    var i = 0;
    while (i < answers.length) {
        if (answers[i].id === answerID) {
            answers.splice(i, 1);
            break;
        }
        ++i;
    }
    delete correctSelection[answerID];
};

var removeMissingAnswersFromCriteria = function() {
    // Just as a precaution, delete any items
    // from correctSelection which are not in answers
    var id;
    var missingIDs = [];
    var answerObject = {};
    var i;

    for (i = 0; i < answers.length; ++i) {
        answerObject[answers[i]] = answers[i];
    }
    for (id in correctSelection) {
        if (!answerObject.hasOwnProperty(id)) {
            missingIDs.push(id);
        }
    }
    for (i = 0; i < missingIDs.length; ++i) {
        delete correctSelection[missingIDs[i]];
        ++i;
    }
};

var addAnswer = function(answerText, isCorrect) {
    var answerID = OL.uuid();
    answers.push({'id': answerID, 'text': answerText});
    correctSelection[answerID] = Boolean(isCorrect);
};

var saveAnswers = function(callback) {
    addStatus('saving');
    OL.setup.replace({
        'answers': answers,
        'type': type
    }, function(result) {
        answers = result.data.answers;
        type    = result.data.type;
        removeStatus('saving');

        if (callback) {
            callback();
        }
    });
};

var saveCriteria = function(callback) {
    removeMissingAnswersFromCriteria();
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

var addStatus = function(status) {
    $('.showStatus').addClass(status);
};

var removeStatus = function(status) {
    $('.showStatus').removeClass(status);
};

var updateAnswer = function(id, text) {
    answers.forEach(function(answer) {
        if (answer.id === id) {
            answer.text = text;
        }
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
                    buildAnswers($container);
                    save();
                })
            ;

            var $checkbox = $('<input>', {
                    'type': itemStyle,
                    'class': 'answer-item',
                    'name': itemName,
                    'value': item.id
                })
                .data('item-id', item.id)
                .prop('checked', Boolean(correctSelection[item.id]))
                .on('click', function() {
                    // update the correct selection data from the selected items
                    $('.answer-item').each(function(i, elt) {
                        var $item = $(elt);
                        correctSelection[$item.val()] = $item.prop('checked');
                    });

                    // save the data
                    addStatus('saving');
                    saveCriteria(function() {
                        removeStatus('saving');
                    });
                })
            ;

            var $input = $('<input>', 
                    {'class': 'item-text form-control'}
                )
                .data('item-id', item.id)
                .val(item.text)
                .on('keyup', _.debounce(function() {
                    var $this = $(this);
                    updateAnswer($this.data('item-id'), $this.val());
                    saveAnswers();
                }, 500))
                .on('blur change', function() {
                    var $this = $(this);
                    updateAnswer($this.data('item-id'), $this.val());
                    saveAnswers();
                })
            ;

            // build the label and input element for the answer
            var $label = $('<label>')
                .append(
                    $checkbox
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
                .append(
                    $input
                )
            ;

            if (answers.length > 1) {
                $label.append($remove);
            }

            var $item = $('<div>')
                .addClass(itemStyle)
                .addClass(itemStyle + '-primary')
                .append($label)
            ;

            $container.append($item);
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
        OL.log(result);
        correctSelection = result.criteria || DEFAULT_CORRECT_SELECTION;
        // build the answers as HTML elements
        buildAnswers($container);

        $('#add-button').on('click', function() {
            addAnswer('', false);
            buildAnswers($container);
            saveAnswers();
        });
    });
});
