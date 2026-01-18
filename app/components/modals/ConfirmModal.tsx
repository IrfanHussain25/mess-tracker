'use client'
import ModalWrapper from './ModalWrapper'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
}

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message }: ConfirmModalProps) {
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-gray-600 text-sm">{message}</p>
        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-700 p-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className="flex-1 bg-red-500 text-white p-3 rounded-xl font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-200"
          >
            Delete
          </button>
        </div>
      </div>
    </ModalWrapper>
  )
}