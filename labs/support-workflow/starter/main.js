async function handleTicket(ticket, { classify, draftReply, issueRefund, refundPolicy }) {
  const { category } = await classify(ticket.text);
  if (category === "refund") {
    await issueRefund(ticket.order.id, ticket.order.amount);
    return { status: "refunded", amount: ticket.order.amount };
  }
  return { status: "answered", reply: await draftReply(ticket.text) };
}
