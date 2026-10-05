// A workflow: code fixes the steps and the model fills in judgment calls (what is this ticket about, how to word the
// reply). Decisions with consequences stay in code: the amount comes from the order record, the policy is a plain
// function, and large or uncertain cases go to a person. An agent, where the model chooses the steps and tools in a
// loop, earns its place when the path can't be known in advance (open-ended research, debugging); it costs
// predictability, so start with a workflow and add autonomy only where it pays.
const HANDLED = new Set(["refund", "question"]);
const MIN_CONFIDENCE = 0.7;
const APPROVAL_OVER = 100;

async function handleTicket(ticket, { classify, draftReply, issueRefund, refundPolicy }) {
  const { category, confidence } = await classify(ticket.text);
  if (!HANDLED.has(category) || !(confidence >= MIN_CONFIDENCE)) {
    return { status: "escalated", reason: `Unsure how to handle this ticket (${category}, ${confidence})` };
  }
  if (category === "question") return { status: "answered", reply: await draftReply(ticket.text) };

  const { order } = ticket;
  const policy = refundPolicy(order);
  if (!policy.eligible) return { status: "declined", reason: policy.reason };
  if (order.amount > APPROVAL_OVER) return { status: "needs_approval", amount: order.amount };
  await issueRefund(order.id, order.amount);
  return { status: "refunded", amount: order.amount };
}
