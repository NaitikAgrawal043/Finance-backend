const mongoose = require("mongoose");

const RecordSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        type: {
            type: String,
            enum: ["income", "expense"],
            required: true,
        },
        category: {
            type: String,
            required: true,
            trim: true,
        },
        date: {
            type: Date,
            required: true,
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes mapping to Prisma's indexing strategy for performance
RecordSchema.index({ userId: 1 });
RecordSchema.index({ type: 1 });
RecordSchema.index({ category: 1 });
RecordSchema.index({ date: 1 });
RecordSchema.index({ deletedAt: 1 });

// Full-text search index on category and notes
RecordSchema.index(
    { category: "text", notes: "text" },
    { name: "category_notes_text", default_language: "english" }
);

RecordSchema.set("toJSON", {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});

module.exports = mongoose.model("Record", RecordSchema);
