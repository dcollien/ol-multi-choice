/**
 * Builds a Quiz Answer Setup (authoring tool, for display on setup.html)
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
      * the values of customisable text
*/
var answers, type, correctSelection, textValues;


/**
 * Delete an answer from the answer list
 * 
 * @param  {string} answerID - ID of the answer to delete from the answers list
 * 
 */
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

/**
 * Remove any answers from the comparison criteria
 * which are not in the answers list
 */
var removeMissingAnswersFromCriteria = function() {
    // Just as a precaution, delete any items
    // from correctSelection which are not in answers
    var id;
    var missingIDs = [];
    var answerObject = {};
    var i;

    for (i = 0; i < answers.length; ++i) {
        answerObject[answers[i].id] = answers[i].id;
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

/**
 * Add an answer to the answers list
 * 
 * @param {string} answerText - The text for the new answer
 * @param {Boolean} isCorrect - Whether the answer is a correct selection
 * 
 */
var addAnswer = function(answerText, isCorrect) {
    var answerID = OL.uuid();
    answers.push({'id': answerID, 'text': answerText});
    correctSelection[answerID] = Boolean(isCorrect);
};

/**
 * Save the setup state
 * 
 * @param  {Function} callback - Called when the state is saved
 */
var saveState = function(callback) {
    addStatus('saving');
    OL.setup.replace({
        'answers': answers,
        'type': type,
        'incorrectMessage': textValues.incorrectMessage,
        'correctMessage': textValues.correctMessage
    }, function(result) {
        answers = result.data.answers;
        type    = result.data.type;
        removeStatus('saving');

        if (typeof callback === 'function') {
            callback();
        }
    });
};

/**
 * Update the textValues state from the UI inputs
 */
var updateTextState = function() {
    textValues.incorrectMessage = $('#incorrect-message-input').val();
    textValues.correctMessage = $('#correct-message-input').val();
};

/**
 * Save the comparison criteria 
 * (secret data storing which answers are correct)
 * 
 * @param  {Function} callback - Called when the criteria is saved
 */
var saveCriteria = function(callback) {
    removeMissingAnswersFromCriteria();
    OL.criteria.replace(correctSelection, function() {
        callback();
    });
};

/**
 * Save everything.
 * 
 * @param  {Function} callback - Called back when save is completed
 */
var save = function(callback) {
    var calls = 0;
    var checkDone = function() {
        (--calls === 0) && callback();
    };

    updateTextState();

    // save state and criteria in parallel
    // and fire the callback when they're all done (in any order)

    calls++;
    saveState(checkDone);

    calls++;
    saveCriteria(checkDone);
};

/**
 * Add a class to any element with a "status" class
 * @param {string} status - The class to add
 */
var addStatus = function(status) {
    $('.status').addClass(status);
};

/**
 * Remove a class from any element with a "status" class
 * @param  {string} - The class to remove
 */
var removeStatus = function(status) {
    $('.status').removeClass(status);
};

/**
 * Replaces the text for a particular answer
 * @param  {string} id - The answer ID in the answers list
 * @param  {string} text - The text value to replace
 */
var updateAnswer = function(id, text) {
    answers.forEach(function(answer) {
        if (answer.id === id) {
            answer.text = text;
        }
    });
};

/**
 * Updates the criteria from the current selection
 */
var updateCriteria = function() {
    // update the correct selection data from the selected items
    $('.answer-item').each(function(i, elt) {
        var $item = $(elt);
        correctSelection[$item.val()] = $item.prop('checked');
    });
};

/**
 * Re-builds the quiz answers setup UI
 * @param  {jQuery} $container - Element to build the quiz inside
 */
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

        // for each answer, build its UI:
        //  * checkbox/radio button
        //  * text input
        //  * remove button
        $.each(answers, function(i, item) {
            if (type === 'multiple') {
                itemName = item.id;
            }

            // remove button
            var $remove = $('<button>', {'class': 'btn btn-default btn-flat btn-remove'})
                .html('&times;')
                .data('item-id', item.id)
                .click(function() {
                    deleteAnswer($(this).data('item-id'));
                    buildAnswers($container);
                    save();
                })
            ;

            // checkbox/radio button
            var $checkbox = $('<input>', {
                    'type': itemStyle,
                    'class': 'answer-item',
                    'name': itemName,
                    'value': item.id
                })
                .data('item-id', item.id)
                .prop('checked', Boolean(correctSelection[item.id]))
                .on('click', function() {
                    updateCriteria();

                    // save the data
                    addStatus('saving');
                    saveCriteria(function() {
                        removeStatus('saving');
                    });
                })
            ;

            // text input
            var $input = $('<input>', 
                    {'class': 'item-text form-control'}
                )
                .data('item-id', item.id)
                .val(item.text)
                .on('keyup', _.debounce(function() {
                    var $this = $(this);
                    updateAnswer($this.data('item-id'), $this.val());
                    saveState();
                }, 500))
                .on('blur change', function() {
                    var $this = $(this);
                    updateAnswer($this.data('item-id'), $this.val());
                    saveState();
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
            $label.append($input);

            // add remove buttons (if there's more than 1 left)
            if (answers.length > 1) {
                $label.append($remove);
            }

            // insert them all into the item
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
    textValues = {
        "correctMessage": OL.setup.data.correctMessage || "",
        "incorrectMessage": OL.setup.data.incorrectMessage || ""
    };
    // Save the messages (debounced) on change
    $('#correct-message-input')
        .val(textValues.correctMessage)
        .on('change keyup', _.debounce(function() {
            updateTextState();
            saveState();
        }, 500))
    ;
    $('#incorrect-message-input')
        .val(textValues.incorrectMessage)
        .on('change keyup', _.debounce(function() {
            updateTextState();
            saveState();
        }, 500))
    ;

    $('#selection-type-input').on('click change', function() {
        type = $(this).val();
        buildAnswers($container);
        updateCriteria();
        save();
    });

    // load the correct selection (criteria data)
    OL.criteria.retrieve(function(result) {
        correctSelection = result.criteria || DEFAULT_CORRECT_SELECTION;
        // build the answers as HTML elements
        buildAnswers($container);

        $('#add-button').on('click', function() {
            addAnswer('', false);
            buildAnswers($container);
            saveState();
        });
    });

    // If told to save, call the save function
    OL.on('save', save);
});
