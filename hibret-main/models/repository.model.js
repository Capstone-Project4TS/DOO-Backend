import mongoose from 'mongoose';

const repoSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, required: true, auto: true },
    name: {
        type: String,
        required: true
    },
    categories: [
        {type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'  }    
        
    ]
});

const Repository = mongoose.model('Repository', repoSchema);

export default Repository;
