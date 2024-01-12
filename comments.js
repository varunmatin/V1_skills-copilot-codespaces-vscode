// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const { randomBytes } = require('crypto');
const axios = require('axios');

// Define constants
const port = 4001;
const commentsByPostId = {};

// Middleware
app.use(bodyParser.json());

// Routes
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Create comment
app.post('/posts/:id/comments', async (req, res) => {
  // Create random id for comment
  const commentId = randomBytes(4).toString('hex');

  // Extract data from request
  const { content } = req.body;

  // Get comments for this post
  const comments = commentsByPostId[req.params.id] || [];

  // Add new comment to comments array
  comments.push({ id: commentId, content, status: 'pending' });

  // Save comments to commentsByPostId
  commentsByPostId[req.params.id] = comments;

  // Emit event to event bus
  await axios.post('http://localhost:4005/events', {
    type: 'CommentCreated',
    data: { id: commentId, content, postId: req.params.id, status: 'pending' },
  });

  // Send response to client
  res.status(201).send(comments);
});

// Receive event from event bus
app.post('/events', async (req, res) => {
  console.log('Event received:', req.body.type);

  // Extract data from request
  const { type, data } = req.body;

  // Check if event is CommentModerated
  if (type === 'CommentModerated') {
    // Get comments for this post
    const comments = commentsByPostId[data.postId];

    // Find comment to update
    const comment = comments.find((comment) => comment.id === data.id);

    // Update comment
    comment.status = data.status;

    // Emit event to event bus
    await axios.post('http://localhost:4005/events', {
      type: 'CommentUpdated',
      data,
    });
  }

  // Send response to client
  res.send({});
});

// Start server
app.listen(port, () => {
  console.log(`Comments service listening on port ${port}`);
});