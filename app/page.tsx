'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from './utils/supabase/client'
import toast from 'react-hot-toast'
import { Camera, PenTool, LogOut } from 'lucide-react'
import { isSameMonth } from 'date-fns'
import Tesseract from 'tesseract.js'

import Greeting from './components/Greeting'
import AnalyticsCard from './components/AnalyticsCard'
import BudgetCard from './components/BudgetCard'
import LogsList from './components/LogsList'
import EditBudgetModal from './components/modals/EditBudgetModal'
import ManualAddModal from './components/modals/ManualAddModal'
import ConfirmModal from './components/modals/ConfirmModal'


export default function Home() {
  const [supabase] = useState(() => createClient())
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [purse, setPurse] = useState(4000)
  const [logs, setLogs] = useState<any[]>([])
  const [spent, setSpent] = useState(0)

  // Modals
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [showManualModal, setShowManualModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{id: string, amount: number} | null>(null)

  // Auth
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)

  useEffect(() => {
    const init = async () => {
      // 1. Check for Shared File (PWA Feature)
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        
        if (params.get('share') === 'true') {
          handleSharedFile()
          window.history.replaceState({}, '', '/')
        }
        
        if (params.get('share_error')) {
          toast.error("Share missed. Please try again.")
          window.history.replaceState({}, '', '/')
        }
      }

      // 2. Check Auth
      const { data: { user } } = await supabase.auth.getUser()
      if (user) { setUser(user); fetchData(user.id) }
      setLoading(false)
    }
    init()
  }, [])

  // --- ROBUST PWA SHARE HANDLER ---
  const handleSharedFile = async () => {
    const t = toast.loading("Loading shared bill...")
    try {
      const request = indexedDB.open('MessWiseDB', 3)
      
      request.onerror = (e) => {
        console.error("DB Error", e)
        toast.dismiss(t)
        toast.error("Storage access failed")
      }

      request.onsuccess = (e: any) => {
        const db = e.target.result
        
        if (!db.objectStoreNames.contains('shares')) {
             console.error("Store missing. Resetting DB.")
             db.close()
             indexedDB.deleteDatabase('MessWiseDB')
             toast.dismiss(t)
             toast.error("App updated. Please share again!")
             return
        }

        const tx = db.transaction('shares', 'readwrite')
        const store = tx.objectStore('shares')
        const getReq = store.get('shared-file')

        getReq.onsuccess = async () => {
          const file = getReq.result
          if (file) {
            store.delete('shared-file') 
            toast.dismiss(t)
            await processOCR(file) 
          } else {
            toast.dismiss(t)
            toast.error("Share Empty. Try again.")
          }
        }
      }
    } catch (err) {
      console.error(err)
      toast.dismiss(t)
    }
  }

  const fetchData = useCallback(async (userId: string) => {
    let { data: settings } = await supabase.from('user_settings').select('monthly_purse').eq('user_id', userId).single()
    if (!settings) {
      await supabase.from('user_settings').insert({ user_id: userId, monthly_purse: 4000 }); settings = { monthly_purse: 4000 }
    }
    setPurse(settings.monthly_purse)

    const { data: logsData } = await supabase.from('mess_logs').select('*').eq('user_id', userId).order('bill_date', { ascending: false })
    
    if (logsData) {
      setLogs(logsData)
      const currentMonthLogs = logsData.filter(log => isSameMonth(new Date(log.bill_date), new Date()))
      setSpent(currentMonthLogs.reduce((acc, item) => acc + Number(item.amount), 0))
    }
  }, [supabase])

  const handleUpdateBudget = async (val: number) => {
    await supabase.from('user_settings').update({ monthly_purse: val }).eq('user_id', user.id)
    setPurse(val); setShowBudgetModal(false); toast.success("Budget Updated")
  }

  const handleManualAdd = async (amt: string, dateStr: string) => {
    const d = dateStr ? new Date(dateStr) : new Date()
    const h = d.getHours()
    const m = d.getMinutes()
    let type = 'Other'
    if (h >= 7 && h < 11) type = 'Breakfast'
    else if (h >= 11 && h < 15) type = 'Lunch'
    else if (h >= 16 && (h < 18 || (h === 18 && m <= 40))) type = 'Snacks'
    else if ((h === 18 && m > 40) || h >= 19 && h < 23) type = 'Dinner'

    const { error } = await supabase.from('mess_logs').insert({ user_id: user.id, amount: parseInt(amt), bill_date: d.toISOString(), meal_type: type })
    
    if (!error) {
      fetchData(user.id)
      setShowManualModal(false)
      toast.success("Added")
    } else {
      toast.error("Add failed")
    }
  }

  const confirmDelete = (id: string, amount: number) => {
    setDeleteTarget({ id, amount })
    setShowDeleteModal(true)
  }

  const executeDelete = async () => {
    if (!deleteTarget) return
    const previousLogs = [...logs]
    const previousSpent = spent

    setLogs(current => current.filter(log => log.id !== deleteTarget.id))
    setSpent(prev => prev - deleteTarget.amount)

    try {
      const { error } = await supabase.from('mess_logs').delete().eq('id', deleteTarget.id)
      if (error) throw error
      toast.success("Transaction Deleted")
    } catch (err: any) {
      setLogs(previousLogs)
      setSpent(previousSpent)
      toast.error("Failed to delete")
    }
  }

  // --- CLIENT SIDE OCR LOGIC ---
  const processOCR = async (file: File) => {
    setUploading(true)
    const t = toast.loading("Scanning Bill...")
    
    try {
      const { data: { text } } = await Tesseract.recognize(
        file,
        'eng',
        { logger: m => {} }
      )

      const billPattern = /Bill\s*No\D*?(\d+)[\s\S]*?Date\D*?(\d{1,2}\/\d{1,2}\/\d{4})[\s\S]*?(\d{1,2}:\d{2}:\d{2})[\s\S]*?Total\D*?(\d+)/gi;
      const bills = []
      let match

      while ((match = billPattern.exec(text)) !== null) {
        const billNo = parseInt(match[1])
        const dateStr = match[2]
        const timeStr = match[3]
        let amount = parseInt(match[4])
        const amtStr = amount.toString()

        // --- SMART PHANTOM DIGIT FIX ---

        // CASE 1: Large Numbers (>1000) starting with 2 or 3
        // e.g., 2345 -> 345 (Correct, 300+ allowed)
        // e.g., 3237 -> 237 (Correct)
        if (amount > 1000 && (amtStr.startsWith('2') || amtStr.startsWith('3'))) {
           amount = parseInt(amtStr.substring(1))
        }
        
        // CASE 2: The 300-Range Glitch
        // Only runs if Case 1 didn't already run (using 'else if')
        // e.g., 397 -> 97 (Correct)
        // e.g., 365 -> 65 (Correct)
        // e.g., 345 -> 345 (Skipped, because 345 comes from Case 1 which had 'else')
        else if (amount >= 300 && amount <= 399) {
           amount = parseInt(amtStr.substring(1))
        }

        let timestamp = new Date().toISOString()
        let mealType = 'Other'
        
        try {
          const d = new Date(`${dateStr} ${timeStr}`)
          timestamp = d.toISOString()
          
          const h = d.getHours()
          const m = d.getMinutes()

          // Breakfast: 7 AM - 10:59 AM
          if (h >= 7 && h < 11) mealType = 'Breakfast'
          
          // Lunch: 11 AM - 2:59 PM
          else if (h >= 11 && h < 15) mealType = 'Lunch'
          
          // Snacks: 4 PM - 6:30 PM
          else if (h >= 16 && (h < 18 || (h === 18 && m <= 40))) mealType = 'Snacks'
          
          // Dinner: 6:31 PM - 11 PM
          else if ((h === 18 && m > 40) || h >= 19 && h < 23) mealType = 'Dinner'
          
        } catch (e) {
          console.error("Date parse error", e)
        }

        bills.push({
          bill_no: billNo,
          amount: amount,
          bill_date: timestamp,
          meal_type: mealType
        })
      }

      if(bills.length > 0) {
        let count = 0
        for(const bill of bills) {
          const exists = logs.some(l => l.bill_no === bill.bill_no && l.amount === bill.amount)
          if(!exists) {
            await supabase.from('mess_logs').insert({ ...bill, user_id: user.id })
            count++
          }
        }
        fetchData(user.id)
        toast.success(`Scanned! Added ${count} new bills`, { id: t })
      } else {
        toast.error("No clear bills found.", { id: t })
      }

    } catch (err: any) {
      console.error(err)
      toast.error("Scan failed.", { id: t })
    } finally {
      setUploading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return
    await processOCR(e.target.files[0])
    e.target.value = '' 
  }

  const handleAuth = async () => {
    if (!email || !password) return toast.error("Please fill in all fields")
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        window.location.reload()
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        toast.success("Account created! Logging you in...")
        window.location.reload()
      }
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  if (!user && !loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 text-gray-900">
      <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-xl space-y-6">
        <h1 className="text-3xl font-bold text-center text-purple-600">MessWise</h1>
        <input className="w-full border p-4 rounded-xl outline-none" placeholder="Email" onChange={e => setEmail(e.target.value)} />
        <input className="w-full border p-4 rounded-xl outline-none" type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
        <button onClick={handleAuth} className="w-full bg-purple-600 text-white p-4 rounded-xl font-bold hover:bg-purple-700">
            {isLogin ? 'Login' : 'Create Account'}
        </button>
        <p className="text-center text-sm text-gray-400 cursor-pointer" onClick={() => setIsLogin(!isLogin)}>{isLogin ? 'New here? Sign up' : 'Login'}</p>
      </div>
    </div>
  )

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>

  return (
    <main className="min-h-screen bg-gray-50 font-sans pb-24">
      <div className="bg-white/80 backdrop-blur-md px-6 py-4 shadow-sm border-b sticky top-0 z-20 flex justify-between items-center">
        <Greeting name={user?.email?.split('@')[0]} />
        <button onClick={() => supabase.auth.signOut().then(() => setUser(null))} className="ml-4 p-2 bg-gray-50 rounded-full text-gray-400 hover:text-red-500"><LogOut size={20}/></button>
      </div>

      <div className="max-w-md mx-auto px-5 pt-6 space-y-6">
        <BudgetCard spent={spent} total={purse} onEdit={() => setShowBudgetModal(true)} />
        <AnalyticsCard logs={logs} />
        <div className="grid grid-cols-2 gap-4">
          <label className={`flex flex-col items-center justify-center p-5 rounded-3xl border bg-white hover:border-purple-200 cursor-pointer group ${uploading ? 'opacity-50' : ''}`}>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" disabled={uploading} />
            <div className="h-12 w-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110"><Camera size={24}/></div>
            <p className="font-bold text-gray-600 text-sm">Scan Bill</p>
          </label>
          <button onClick={() => setShowManualModal(true)} className="flex flex-col items-center justify-center p-5 rounded-3xl border bg-white hover:border-purple-200 group">
             <div className="h-12 w-12 bg-gray-50 text-gray-500 rounded-full flex items-center justify-center mb-2 group-hover:scale-110"><PenTool size={24}/></div>
            <p className="font-bold text-gray-600 text-sm">Manual Add</p>
          </button>
        </div>
        
        <LogsList logs={logs} onDelete={confirmDelete} />
      </div>

      <EditBudgetModal isOpen={showBudgetModal} onClose={() => setShowBudgetModal(false)} currentBudget={purse} onSave={handleUpdateBudget} />
      <ManualAddModal isOpen={showManualModal} onClose={() => setShowManualModal(false)} onAdd={handleManualAdd} />
      <ConfirmModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={executeDelete} title="Delete Transaction" message={`Delete this transaction of ₹${deleteTarget?.amount}?`} />
    </main>
  )
}