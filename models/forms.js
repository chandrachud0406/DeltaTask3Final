var mongoose = require('mongoose');
var questions = require('./questions');

var formSchema = new mongoose.Schema({
    title: String,
    desc: String,
    totalq: { type: Number,default: 1},
    questions:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: "questions",
        default: []
    }],
    mcqOptions:[Number],
    graphQns:{
        type:Number,
        default: 1
    },
    filledUsers: [String],
    totalResponses : Number,
    expiryDate:{
        type:Date,
        default: +new Date() + 7*24*60*60*1000
    },
    limitToOneResponse:{
        type:Boolean, 
        default: false
    },
    formatDate: String
});

module.exports = mongoose.model('forms', formSchema);