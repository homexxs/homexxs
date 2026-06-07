import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { invokeLLM } from '@/lib/integrations';
import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, ExternalLink } from "lucide-react";

const WHATSAPP_LINK = "https://wa.link/4l384a";

// ── Full FAQ knowledge base ──────────────────────────────────────
const FAQ = [
  {
    keywords: ["what is home x", "what is homex", "about home x", "what do you do", "who are you", "tell me about"],
    answer: "Home X is a luxury home care technology service that helps you care for and maintain the beauty of your home for a full year. With one monthly subscription, we handle all your home care needs — from deep cleaning to servicing your appliances."
  },
  {
    keywords: ["what does home x entail", "what do you offer", "what is included", "what's included", "cover", "coverage", "services included"],
    answer: "Your Home X subscription includes:\n• 🧹 General Deep Cleaning — once every 2 months\n• 🪑 Chair vacuuming — once every quarter\n• 🛏️ Mattress vacuuming & sterilisation — 2x per year\n• ❄️ AC servicing — 2x per year\n• 🐛 Fumigation — 2x per year\n• 🔧 Routine fixes & checks — on-demand\n• 📦 Bluefusion home essentials box"
  },
  {
    keywords: ["general cleaning", "what is general cleaning", "what does cleaning include", "cleaning entail"],
    answer: "General Cleaning covers:\n• Bathroom & toilet walls — thorough wash\n• Deep cleaning of the kitchen (walls, floor, cabinets)\n• Cleaning of windows inside & outside\n• Freezer cleaning\n• Full scrub of surfaces"
  },
  {
    keywords: ["deep cleaning", "general deep cleaning", "cobweb", "chandelier", "gadget"],
    answer: "General Deep Cleaning includes:\n• Removal of cobwebs throughout the home\n• Cleaning of electrical & electronic gadgets\n• Cleaning of chandeliers\n• All areas covered in General Cleaning\n• A more thorough top-to-bottom clean of every room"
  },
  {
    keywords: ["consumables", "cleaning supplies", "bring your own", "who provides", "materials", "soap", "mop"],
    answer: "Consumables are provided by the client. The list of required consumables includes:\n• Soap\n• Mops\n• Fiber napkins\n• Toilet cleaner\n• Window cleaner\n• Provision of water\n\nOur team brings expertise — you provide the supplies!"
  },
  {
    keywords: ["areas", "which area", "rooms", "standard cleaning", "what rooms", "bedroom", "kitchen", "bathroom", "living room"],
    answer: "Our standard deep cleaning covers all major areas of your home:\n• 🚿 Toilet & Bathroom\n• 🍳 Kitchen\n• 🛋️ Living Room\n• 🛏️ Bedroom(s)\n\nYou can also request custom areas — just chat or call HomeX!"
  },
  {
    keywords: ["insurance", "insured", "damage", "damages", "breakage", "liability"],
    answer: "Yes! Home X has a comprehensive insurance policy in place. In the event of any accidental damage during a service visit, our insurance covers it. Your home is safe with us. 🛡️"
  },
  {
    keywords: ["how many cleaner", "how many staff", "number of cleaner", "team size", "how many people"],
    answer: "The number of cleaners we send depends on the type of home you live in. Could you tell me what type of home you live in? (e.g. Mini flat, 2-bedroom flat, duplex, mansion) — and I'll give you the exact team size for your home! 🏠"
  },
  {
    keywords: ["how long", "duration", "time", "hours", "how many hours", "how much time"],
    answer: "A standard cleaning session takes approximately 6 hours. This ensures we do a thorough, quality job across all areas of your home. ⏱️"
  },
  {
    keywords: ["reschedule", "rescheduling", "change date", "change time", "move booking", "postpone"],
    answer: "To reschedule a service:\n• Give us at least 24 hours notice\n• Go to your Dashboard, find the booking, and click 'Reschedule'\n• Pick a new available date and time\n\nFor specially timed requests, you can also raise a query or chat HomeX directly. ✅"
  },
  {
    keywords: ["not satisfied", "unsatisfied", "bad service", "complaint", "unhappy", "poor service", "dissatisfied"],
    answer: "We're sorry to hear that! If you're not satisfied with a service:\n1. 📝 Raise a query on your portal (Support Tickets)\n2. 💬 Chat with HomeX directly\n\nWe take quality very seriously and will make it right for you."
  },
  {
    keywords: ["special", "customise", "customize", "custom service", "special area", "specific area", "extra area"],
    answer: "Absolutely! You can request special areas to be cleaned or a fully customised service. Here's how:\n• 💬 Chat or call HomeX\n• 📝 Raise a query on the portal\n• 📧 Send a mail to HomeX\n\nWe're flexible and happy to tailor our service to your needs!"
  },
  {
    keywords: ["how much", "price", "pricing", "cost", "charge", "fee", "rate", "subscription"],
    answer: "Our monthly subscription plans are based on your home size:\n• Mini Flat — ₦10,000/mo\n• 2 Bedroom Flat — ₦15,000/mo\n• 3 Bedroom Flat — ₦20,000/mo ⭐ Most Popular\n• 3 Bedroom Duplex — ₦25,000/mo\n• 4 Bedroom Flat — ₦30,000/mo\n• 4 Bedroom Duplex — ₦35,000/mo\n• 5 Bedroom Mansion — ₦50,000/mo\n\nAll plans include the full annual cover. Visit the Pricing section for more details!"
  },
  {
    keywords: ["convenient time", "pick my time", "choose time", "preferred time", "specific time"],
    answer: "For a specially timed or convenient booking:\n1. Raise a query on the portal\n2. Chat directly with HomeX\n\nWe'll do our best to accommodate your preferred schedule! 🕐"
  },
  {
    keywords: ["book", "booking", "schedule service", "how to book", "make a booking"],
    answer: "Booking is easy!\n1. Click 'Book a Service' in the sidebar\n2. Choose your service type\n3. Pick a date and time\n4. Enter your address\n5. Confirm — and we'll handle the rest! 🎉"
  },
  {
    keywords: ["payment", "pay", "billing", "invoice", "how to pay"],
    answer: "You pay a fixed monthly fee based on your home size. Head to 'Payments & Billing' in the sidebar to view your transaction history, outstanding invoices, and make payments. 💳"
  },
  {
    keywords: ["ticket", "support", "help", "raise query", "complaint", "issue"],
    answer: "For any support request:\n1. Go to 'Support Tickets' in your sidebar\n2. Click 'New Ticket'\n3. Fill in the details and submit\n\nOur team will respond promptly. You can also chat HomeX for urgent matters! 🎫"
  },
  {
    keywords: ["berry", "who is berry", "what is berry", "contact berry"],
    answer: "HomeX is our dedicated customer relationship assistant — your go-to person for personalised help, custom requests, complaints, and special scheduling. You can chat or call HomeX directly, or reach out via the Support section on your portal. 🌟"
  },
  {
    keywords: ["fumigation", "pest", "insects", "bugs"],
    answer: "Fumigation is included in your annual cover — done 2 times per year. Our team uses professional-grade treatments to ensure your home is pest-free and safe for your family. 🐛"
  },
  {
    keywords: ["mattress", "sterilise", "sterilize", "vacuum mattress"],
    answer: "Mattress vacuuming and sterilisation is included 2 times per year in your subscription. We use professional equipment to remove dust mites, allergens, and bacteria — giving you a healthier sleep environment. 🛏️"
  },
  {
    keywords: ["ac", "air condition", "aircon", "air conditioning", "air-con"],
    answer: "AC servicing is included 2 times per year. Our technicians will clean filters, check refrigerant levels, and ensure your AC is running efficiently and hygienically. ❄️"
  },
  {
    keywords: ["chair", "sofa", "couch", "furniture", "upholstery"],
    answer: "Chair/sofa vacuuming is included once every quarter (4 times a year) in your subscription. We'll keep your upholstery fresh, clean, and dust-free! 🪑"
  },
  {
    keywords: ["cancel", "cancellation", "cancel booking", "stop service"],
    answer: "To cancel a booking, go to your Dashboard, find the booking and click 'Cancel'. Please note that for scheduling changes, giving at least 24 hours notice is appreciated. For subscription cancellations, please reach out via Support Tickets or chat HomeX."
  },
];

// ── Keyword matcher ──────────────────────────────────────────────
function findLocalAnswer(question) {
  const q = question.toLowerCase();
  for (const item of FAQ) {
    if (item.keywords.some(kw => q.includes(kw))) return item.answer;
  }
  // fallback partial word match
  for (const item of FAQ) {
    const words = q.split(/\s+/).filter(w => w.length > 3);
    if (words.some(w => item.keywords.some(kw => kw.includes(w)))) return item.answer;
  }
  return null;
}

const WHATSAPP_MSG = {
  role: "assistant",
  text: "I don't have a specific answer for that question, but I don't want to leave you without help! 💬 Please connect with a **Live Human** on WhatsApp for immediate assistance:",
  whatsapp: true,
};

const QUICK_QUESTIONS = [
  "What's included in my cover?",
  "How do I book a service?",
  "How long does cleaning take?",
  "What are the prices?",
  "Do you bring consumables?",
  "Are you insured?",
];

// ── Render message text with basic formatting ─────────────────────
function MessageText({ text }) {
  const lines = text.split("\n");
  return (
    <div className="text-sm leading-relaxed space-y-0.5">
      {lines.map((line, i) => (
        <div key={i}>{line || <br />}</div>
      ))}
    </div>
  );
}

export default function ChatBot({ user }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: `Hi ${user?.full_name?.split(" ")[0] || "there"} 👋 I'm HomeX, your Home X assistant! I can answer questions about our services, pricing, cleaning coverage, scheduling and more.\n\nHow can I help you today?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async (text) => {
    const question = (text || input).trim();
    if (!question) return;
    setInput("");
    setMessages(p => [...p, { role: "user", text: question }]);
    setLoading(true);

    // Try local FAQ first
    const localAnswer = findLocalAnswer(question);
    if (localAnswer) {
      setTimeout(() => {
        setMessages(p => [...p, { role: "assistant", text: localAnswer }]);
        setLoading(false);
      }, 500);
      return;
    }

    // Try LLM with Home X context
    try {
      const result = await invokeLLM({
        prompt: `You are HomeX, a friendly assistant for Home X (formerly Home Xperts), a luxury Nigerian home care subscription service.

Key facts about Home X:
- Monthly plans from ₦10,000 (Mini Flat) to ₦50,000 (5-Bed Mansion)
- Annual cover includes: deep cleaning every 2 months, fumigation 2x/year, mattress vacuuming 2x/year, chair vacuuming every quarter, AC servicing 2x/year, routine fixes, Bluefusion essentials box
- Cleaning consumables are provided by the client (soap, mops, fiber napkins, toilet cleaner, window cleaner, water)
- Standard cleaning takes 6 hours
- Company is insured against damages
- For rescheduling: 24 hours notice required
- For complaints or custom requests: raise a ticket on the portal or chat HomeX
- For specially timed bookings: raise a query or chat HomeX

Answer the following question concisely and helpfully. If you cannot answer from this context, respond ONLY with the exact text: CONNECT_TO_HUMAN

User question: ${question}`,
      });

      if (result?.includes("CONNECT_TO_HUMAN") || !result) {
        setMessages(p => [...p, WHATSAPP_MSG]);
      } else {
        setMessages(p => [...p, { role: "assistant", text: result }]);
      }
    } catch {
      setMessages(p => [...p, WHATSAPP_MSG]);
    }
    setLoading(false);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full items-center justify-center shadow-2xl shadow-purple-300/50 hover:scale-110 transition-transform ${open ? "hidden" : "flex"}`}
      >
        <MessageCircle className="w-6 h-6 text-white" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl shadow-black/20 flex flex-col overflow-hidden border border-gray-100" style={{ height: 520 }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-700 to-indigo-700 px-4 py-3.5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold text-white">B</div>
              <div>
                <div className="text-white font-bold text-sm">HomeX · Home X Assistant</div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-white/70 text-[10px]">Online — here to help</span>
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white transition-colors p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5
                  ${msg.role === "user"
                    ? "bg-purple-600 text-white rounded-br-sm text-sm leading-relaxed"
                    : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm"}`}>
                  {msg.role === "assistant" ? <MessageText text={msg.text} /> : msg.text}
                  {msg.whatsapp && (
                    <a
                      href={WHATSAPP_LINK}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2.5 flex items-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Chat with a Live Human on WhatsApp
                      <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
                    </a>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                  <span className="text-xs text-gray-400">HomeX is typing...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick questions — shown on first load */}
          {messages.length === 1 && (
            <div className="px-3 pb-2 bg-gray-50 flex-shrink-0">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1.5 px-1">Quick questions</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_QUESTIONS.map(q => (
                  <button key={q} onClick={() => send(q)}
                    className="text-[11px] px-2.5 py-1 bg-white border border-purple-200 text-purple-700 rounded-full hover:bg-purple-50 transition-colors font-medium">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 bg-white border-t border-gray-100 flex gap-2 flex-shrink-0">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Ask HomeX anything..."
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-gray-50"
            />
            <button onClick={() => send()} disabled={!input.trim() || loading}
              className="w-9 h-9 bg-purple-600 text-white rounded-xl flex items-center justify-center hover:bg-purple-700 disabled:opacity-40 transition-colors flex-shrink-0">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}