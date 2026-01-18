'use client'
import { useState, useEffect } from 'react'
import { createClient } from './utils/supabase/client'
import toast from 'react-hot-toast'
import { Camera, PenTool, LogOut } from 'lucide-react'

// Components
import BudgetCard from './components/BudgetCard'
import LogsList from './components/LogsList'
import EditBudgetModal from './components/modals/EditBudgetModal'
import ManualAddModal from './components/modals/ManualAddModal'

export default function Home() {
  const supabase = createClient()
  
  // -- State --
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [purse, setPurse] = useState(4000)
  const [logs, setLogs] = useState<any[]>([])
  const [spent, setSpent] = useState(0)
  const [uploading, setUploading] = useState(false)
  
  // Modals
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [showManualModal, setShowManualModal] = useState(false)

  // Auth Form
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)

  // -- Init --
  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      fetchData(user.id)
    }
    setLoading(false)
  }

  const fetchData = async (userId: string) => {
    // 1. Fetch Budget
    let { data: settings } = await supabase.from('user_settings').select('monthly_purse').eq('user_id', userId).single()
    if (!settings) {
      await supabase.from('user_settings').insert({ user_id: userId, monthly_purse: 4000 })
      setPurse(4000)
    } else {
      setPurse(settings.monthly_purse)
    }

    // 2. Fetch Logs
    const { data: logsData } = await supabase
      .from('mess_logs')
      .select('*')
      .eq('user_id', userId)
      .order('bill_date', { ascending: false })

    if (logsData) {
      setLogs(logsData)
      setSpent(logsData.reduce((acc, item) => acc + Number(item.amount), 0))
    }
  }

  // -- Logic --

  const handleUpdateBudget = async (newAmount: number) => {
    const { error } = await supabase.from('user_settings').update({ monthly_purse: newAmount }).eq('user_id', user.id)
    if (error) {
      toast.error("Failed to update budget")
    } else {
      setPurse(newAmount)
      setShowBudgetModal(false)
      toast.success("Budget updated successfully!")
    }
  }

  const handleManualAdd = async (amountStr: string, dateStr: string) => {
    const amount = parseInt(amountStr)
    const date = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString()
    
    const { error } = await supabase.from('mess_logs').insert({
      user_id: user.id,
      amount,
      bill_date: date,
      bill_no: null
    })

    if (error) {
      toast.error("Failed to add entry")
    } else {
      fetchData(user.id)
      setShowManualModal(false)
      toast.success("Transaction added!")
    }
  }

  const handleDelete = (id: string, amount: number) => {
    // Custom Toast Confirmation
    toast((t) => (
      <div className="flex flex-col gap-2">
        <span className="font-semibold">Delete this ₹{amount} log?</span>
        <div className="flex gap-2">
          <button 
            onClick={async () => {
              toast.dismiss(t.id)
              const { error } = await supabase.from('mess_logs').delete().eq('id', id)
              if (!error) {
                toast.success("Deleted")
                fetchData(user.id)
              }
            }}
            className="bg-red-500 text-white px-3 py-1 rounded text-sm"
          >
            Delete
          </button>
          <button 
            onClick={() => toast.dismiss(t.id)}
            className="bg-gray-200 px-3 py-1 rounded text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: 4000 })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return
    setUploading(true)
    const loadToast = toast.loading("Scanning bill...")
    
    const formData = new FormData()
    formData.append('file', e.target.files[0])

    try {
      const res = await fetch('/api/ocr', { method: 'POST', body: formData })
      const result = await res.json()

      if (result.success && result.data.length > 0) {
        let added = 0
        let skipped = 0

        for (const bill of result.data) {
          // Check Duplicate (Same Bill No + Same Amount)
          const isDuplicate = logs.some(l => l.bill_no === bill.bill_no && l.amount === bill.amount)
          
          if (!isDuplicate) {
            await supabase.from('mess_logs').insert({
              user_id: user.id,
              amount: bill.amount,
              bill_no: bill.bill_no,
              bill_date: bill.bill_date
            })
            added++
          } else {
            skipped++
          }
        }
        
        fetchData(user.id)
        toast.dismiss(loadToast)
        
        // Detailed Result Toast
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 p-4`}>
             <div className="flex-1 w-0">
                <div className="flex items-start">
                   <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900">Scan Complete</p>
                      <p className="mt-1 text-sm text-gray-500">
                        Added {added} new bills.<br/>
                        Skipped {skipped} duplicates.
                      </p>
                   </div>
                </div>
             </div>
             <div className="flex border-l border-gray-200 ml-4">
                <button onClick={() => toast.dismiss(t.id)} className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500">
                  Close
                </button>
             </div>
          </div>
        ), { duration: 5000 })

      } else {
        toast.error("No clear bills found", { id: loadToast })
      }
    } catch (err) {
      toast.error("Scan failed", { id: loadToast })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  // -- Render Login --
  if (!user && !loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl space-y-6">
        <h1 className="text-3xl font-bold text-center text-blue-600">MessWise</h1>
        <input className="w-full border p-3 rounded-xl bg-gray-50" placeholder="Email" onChange={e => setEmail(e.target.value)} />
        <input className="w-full border p-3 rounded-xl bg-gray-50" type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
        <button 
          onClick={async () => {
             const action = isLogin ? supabase.auth.signInWithPassword : supabase.auth.signUp
             const { error } = await action({ email, password })
             if (error) toast.error(error.message)
             else { toast.success("Welcome!"); window.location.reload() }
          }} 
          className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
        >
          {isLogin ? 'Login' : 'Create Account'}
        </button>
        <p className="text-center text-sm text-gray-500 cursor-pointer" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? 'New here? Sign up' : 'Has account? Login'}
        </p>
      </div>
    </div>
  )

  if (loading) return <div className="h-screen flex items-center justify-center text-gray-400">Loading...</div>

  // -- Render Dashboard --
  return (
    <main className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <div className="bg-blue-600 p-6 pb-20 rounded-b-[2.5rem] shadow-lg shadow-blue-200 relative">
        <div className="flex justify-between items-center text-white max-w-md mx-auto">
          <div>
            <h1 className="text-xl font-bold">Dashboard</h1>
            <p className="text-blue-200 text-xs">{user?.email}</p>
          </div>
          <button onClick={() => supabase.auth.signOut().then(() => setUser(null))} className="p-2 bg-blue-700/50 rounded-full hover:bg-blue-700 transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 -mt-14 space-y-6">
        <BudgetCard spent={spent} total={purse} onEdit={() => setShowBudgetModal(true)} />

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <label className={`
            flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer bg-white border-blue-200 hover:bg-blue-50 group
            ${uploading ? 'opacity-50 pointer-events-none' : ''}
          `}>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" disabled={uploading} />
            <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Camera size={20} />
            </div>
            <p className="font-bold text-gray-700 text-sm">Scan Bill</p>
          </label>

          <button 
            onClick={() => setShowManualModal(true)}
            className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed bg-white border-gray-200 hover:bg-gray-50 transition-all group"
          >
             <div className="h-10 w-10 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
               <PenTool size={20} />
             </div>
            <p className="font-bold text-gray-700 text-sm">Manual Add</p>
          </button>
        </div>

        <LogsList logs={logs} onDelete={handleDelete} />
      </div>

      {/* Modals */}
      <EditBudgetModal 
        isOpen={showBudgetModal} 
        onClose={() => setShowBudgetModal(false)} 
        currentBudget={purse}
        onSave={handleUpdateBudget}
      />

      <ManualAddModal 
        isOpen={showManualModal} 
        onClose={() => setShowManualModal(false)} 
        onAdd={handleManualAdd}
      />
    </main>
  )
}