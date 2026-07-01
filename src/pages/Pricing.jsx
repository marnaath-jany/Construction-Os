import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useSubscription } from '../context/SubscriptionContext'
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3'
import { FiCheck, FiZap, FiAward } from 'react-icons/fi'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceRWF: 0,
    desc: 'Perfect for trying out Construction OS',
    color: '#888784',
    bg: '#f5f5f3',
    border: '#e5e5e3',
    features: [
      '1 project',
      '3 team members',
      'Basic dashboard',
      'BOQ builder',
      'Community support',
    ],
    limits: ['No Gantt chart', 'No site reports', 'No PDF export'],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    priceRWF: 38000,
    desc: 'Great for small contractors',
    color: '#185FA5',
    bg: '#E6F1FB',
    border: '#185FA5',
    features: [
      '5 projects',
      '10 team members',
      'Gantt chart',
      'Daily site reports',
      'BOQ with payment tracking',
      'Email support',
    ],
    limits: ['No PDF export', 'No white-label'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79,
    priceRWF: 103000,
    desc: 'Most popular for growing firms',
    color: '#1D9E75',
    bg: '#E1F5EE',
    border: '#1D9E75',
    popular: true,
    features: [
      '20 projects',
      '50 team members',
      'Everything in Starter',
      'PDF export',
      'Invoice generator',
      'Priority support',
      'Advanced analytics',
    ],
    limits: [],
  },
  {
    id: 'business',
    name: 'Business',
    price: 199,
    priceRWF: 260000,
    desc: 'For large construction companies',
    color: '#534AB7',
    bg: '#EEEDFE',
    border: '#534AB7',
    features: [
      'Unlimited projects',
      'Unlimited team members',
      'Everything in Pro',
      'White-label branding',
      'API access',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
    ],
    limits: [],
  },
]

function PlanCard({ plan, billing, onSubscribe, loading, currentPlan, dark, t }) {
  const price = billing === 'yearly'
    ? Math.round(plan.priceRWF * 0.8)
    : plan.priceRWF
  const isCurrentPlan = currentPlan === plan.id
  const isLoading = loading === plan.id

  return (
    <div style={{
      background: t.card,
      border: `2px solid ${plan.popular ? plan.border : isCurrentPlan ? plan.border : t.border}`,
      borderRadius: 14, padding: '1.5rem',
      position: 'relative',
      boxShadow: plan.popular ? '0 4px 24px rgba(29,158,117,0.12)' : 'none',
    }}>
      {plan.popular && (
        <div style={{
          position: 'absolute', top: -12, left: '50%',
          transform: 'translateX(-50%)',
          background: '#1D9E75', color: '#fff',
          fontSize: 11, fontWeight: 600,
          padding: '3px 14px', borderRadius: 20, whiteSpace: 'nowrap'
        }}>
          ⭐ Most Popular
        </div>
      )}

      {isCurrentPlan && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          background: plan.bg, color: plan.color,
          fontSize: 10, fontWeight: 600,
          padding: '2px 8px', borderRadius: 20
        }}>
          ✓ Current plan
        </div>
      )}

      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{
          display: 'inline-block', padding: '4px 10px',
          borderRadius: 8, background: plan.bg,
          color: plan.color, fontSize: 12, fontWeight: 600, marginBottom: 10
        }}>
          {plan.name}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 2 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: t.text }}>
            {plan.price === 0 ? 'Free' : `RWF ${price.toLocaleString()}`}
          </span>
          {plan.price > 0 && (
            <span style={{ fontSize: 12, color: t.sub, marginBottom: 6 }}>/mo</span>
          )}
        </div>

        {billing === 'yearly' && plan.price > 0 && (
          <p style={{ fontSize: 11, color: '#1D9E75', margin: '0 0 4px', fontWeight: 500 }}>
            💰 Save RWF {Math.round(plan.priceRWF * 0.2 * 12).toLocaleString()} per year
          </p>
        )}

        <p style={{ fontSize: 12, color: t.sub, margin: 0 }}>{plan.desc}</p>
      </div>

      <button
        onClick={() => onSubscribe(plan)}
        disabled={isLoading || isCurrentPlan}
        style={{
          width: '100%', padding: '10px', borderRadius: 9,
          border: `1px solid ${plan.popular ? '#1D9E75' : t.border}`,
          background: isCurrentPlan ? t.hover : plan.popular ? '#1D9E75' : plan.price === 0 ? t.hover : plan.bg,
          color: isCurrentPlan ? t.sub : plan.popular ? '#fff' : plan.price === 0 ? t.text : plan.color,
          fontWeight: 600, fontSize: 13,
          cursor: isCurrentPlan ? 'not-allowed' : 'pointer',
          marginBottom: '1.25rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          opacity: isCurrentPlan ? 0.7 : 1,
          transition: 'all 0.15s'
        }}
      >
        {isLoading ? '⏳ Processing...' :
         isCurrentPlan ? '✓ Current plan' :
         plan.price === 0 ? 'Get started free' :
         <><FiZap size={13} /> Subscribe — RWF {price.toLocaleString()}</>}
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {plan.features.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: t.text }}>
            <FiCheck size={13} style={{ color: plan.color, flexShrink: 0 }} />
            {f}
          </div>
        ))}
        {plan.limits.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: t.sub }}>
            <span style={{ fontSize: 11, flexShrink: 0 }}>✕</span>
            {f}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Pricing() {
  const { user } = useAuth()
  const { dark } = useTheme()
  const { plan: currentPlan, upgradePlan } = useSubscription()
  const navigate = useNavigate()
  const [loading, setLoading] = useState('')
  const [billing, setBilling] = useState('monthly')
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [success, setSuccess] = useState(false)

  const t = {
    bg: dark ? '#111110' : '#f5f5f3',
    card: dark ? '#1c1c1a' : '#ffffff',
    border: dark ? '#2e2e2b' : '#e5e5e3',
    text: dark ? '#e8e8e6' : '#111110',
    sub: dark ? '#888784' : '#888784',
    hover: dark ? '#252523' : '#f5f5f3',
  }

  const flutterwaveConfig = selectedPlan ? {
    public_key: process.env.REACT_APP_FLW_PUBLIC_KEY,
    tx_ref: `CONSTR-${Date.now()}-${user?.id?.slice(0, 8)}`,
    amount: billing === 'yearly'
      ? Math.round(selectedPlan.priceRWF * 0.8 * 12)
      : selectedPlan.priceRWF,
    currency: 'RWF',
    payment_options: 'card, mobilemoney, ussd',
    customer: {
      email: user?.email || '',
      name: user?.email?.split('@')[0] || 'User',
    },
    customizations: {
      title: 'Construction OS',
      description: `${selectedPlan.name} Plan — ${billing === 'yearly' ? 'Annual' : 'Monthly'} subscription`,
      logo: 'https://your-logo-url.com/logo.png',
    },
    meta: {
      user_id: user?.id,
      plan: selectedPlan.id,
      billing,
    }
  } : null

  const handleFlutterPayment = useFlutterwave(flutterwaveConfig || {
    public_key: process.env.REACT_APP_FLW_PUBLIC_KEY || '',
    tx_ref: 'placeholder',
    amount: 0,
    currency: 'RWF',
    customer: { email: '' },
    customizations: { title: '', description: '' }
  })

  async function handleSubscribe(plan) {
    if (!user) { navigate('/auth'); return }
    if (plan.price === 0) { navigate('/'); return }
    if (currentPlan === plan.id) return

    setSelectedPlan(plan)
    setLoading(plan.id)

    setTimeout(() => {
      handleFlutterPayment({
        callback: async (response) => {
          closePaymentModal()
          if (response.status === 'successful' || response.status === 'completed') {
            await upgradePlan(plan.id, response.transaction_id, response.tx_ref)
            setSuccess(true)
            setLoading('')
            setSelectedPlan(null)
          } else {
            alert('Payment was not completed. Please try again.')
            setLoading('')
            setSelectedPlan(null)
          }
        },
        onClose: () => {
          setLoading('')
          setSelectedPlan(null)
        }
      })
    }, 100)
  }

  if (success) {
    return (
      <div style={{ fontFamily: 'sans-serif', minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 8px', color: t.text }}>Payment successful!</h1>
          <p style={{ color: t.sub, fontSize: 14, marginBottom: 24 }}>
            Your plan has been upgraded. You now have access to all {currentPlan} features.
          </p>
          <button
            onClick={() => navigate('/')}
            style={{ padding: '10px 28px', borderRadius: 9, border: 'none', background: '#1D9E75', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
          >
            Go to dashboard →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 1000, margin: '0 auto', padding: '2rem 1rem', color: t.text }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <button onClick={() => navigate('/')} style={{ fontSize: 12, color: t.sub, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 12 }}>
          ← Dashboard
        </button>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: '0 0 8px', color: t.text }}>
          Simple, transparent pricing
        </h1>
        <p style={{ fontSize: 14, color: t.sub, margin: '0 0 24px' }}>
          Pay with MTN Mobile Money, Airtel Money or Card. No hidden fees.
        </p>

        {/* Payment badges */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {['📱 MTN MoMo', '📱 Airtel Money', '💳 Visa/Mastercard', '🔒 Secure payment'].map((b, i) => (
            <span key={i} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: t.card, border: `1px solid ${t.border}`, color: t.sub }}>
              {b}
            </span>
          ))}
        </div>

        {/* Billing toggle */}
        <div style={{ display: 'inline-flex', background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: 4, gap: 4 }}>
          {[
            { value: 'monthly', label: '📆 Monthly' },
            { value: 'yearly', label: '📅 Yearly (save 20%)' }
          ].map(b => (
            <button
              key={b.value}
              onClick={() => setBilling(b.value)}
              style={{
                padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: billing === b.value ? '#1D9E75' : 'transparent',
                color: billing === b.value ? '#fff' : t.sub,
                fontWeight: billing === b.value ? 500 : 400,
                fontSize: 13, transition: 'all 0.15s'
              }}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Current plan banner */}
      {currentPlan !== 'free' && (
        <div style={{ background: '#E1F5EE', border: '1px solid #A8DFC0', borderRadius: 10, padding: '10px 16px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiAward size={16} style={{ color: '#0F6E56' }} />
          <span style={{ fontSize: 13, color: '#0F6E56', fontWeight: 500 }}>
            You're on the <strong>{currentPlan}</strong> plan. Upgrade anytime for more features.
          </span>
        </div>
      )}

      {/* Plans grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginBottom: '2rem' }}>
        {PLANS.map(plan => (
          <PlanCard
            key={plan.id}
            plan={plan}
            billing={billing}
            onSubscribe={handleSubscribe}
            loading={loading}
            currentPlan={currentPlan}
            dark={dark}
            t={t}
          />
        ))}
      </div>

      {/* Payment methods info */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: '1.25rem', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: 14, fontWeight: 500, margin: '0 0 12px', color: t.text }}>🇷🇼 Payment methods available in Rwanda</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          {[
            { icon: '📱', name: 'MTN Mobile Money', desc: 'Pay directly from your MTN MoMo wallet' },
            { icon: '📱', name: 'Airtel Money', desc: 'Pay directly from your Airtel Money wallet' },
            { icon: '💳', name: 'Visa / Mastercard', desc: 'International credit and debit cards' },
            { icon: '🔒', name: 'Secure & encrypted', desc: 'Powered by Flutterwave, trusted by 1M+ businesses' },
          ].map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 20 }}>{m.icon}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 2px', color: t.text }}>{m.name}</p>
                <p style={{ fontSize: 11, color: t.sub, margin: 0 }}>{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: '1.5rem' }}>
        <h2 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 1rem', color: t.text }}>Frequently asked questions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {[
            { q: 'Can I cancel anytime?', a: 'Yes, cancel anytime from your account settings. You keep access until the end of your billing period.' },
            { q: 'Is there a free trial?', a: 'Yes! The Free plan lets you try the core features with 1 project. Upgrade anytime.' },
            { q: 'How does MTN MoMo payment work?', a: 'Enter your MTN number, you\'ll get a prompt on your phone to approve the payment. Done in seconds.' },
            { q: 'Can I switch plans?', a: 'Yes, upgrade or downgrade anytime from the pricing page. Changes take effect immediately.' },
            { q: 'Is my payment secure?', a: 'Yes, all payments are processed by Flutterwave, which is PCI DSS compliant and trusted across Africa.' },
            { q: 'Do you offer discounts?', a: 'Yes! Choose yearly billing to save 20% on any paid plan.' },
          ].map((item, i) => (
            <div key={i}>
              <p style={{ fontSize: 13, fontWeight: 500, color: t.text, margin: '0 0 4px' }}>{item.q}</p>
              <p style={{ fontSize: 12, color: t.sub, margin: 0, lineHeight: 1.6 }}>{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}