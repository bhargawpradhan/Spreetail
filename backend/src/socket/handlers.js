function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on('expense:join', (expenseId) => {
      socket.join(`expense:${expenseId}`);
    });

    socket.on('expense:leave', (expenseId) => {
      socket.leave(`expense:${expenseId}`);
    });
  });
}

module.exports = { setupSocketHandlers };
