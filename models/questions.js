var mongoose = require('mongoose');

var questionSchema = new mongoose.Schema({
    question: String,
    answerType: String,
    position: Number,
    graphPos: Number,
    answer: [mongoose.Schema.Types.Mixed],
    options :[String],
    optionCount : [Number],
    files: [{
        contentType: String,
        url: String,
        pos: Number
    }]
});

module.exports = mongoose.model('questions', questionSchema);