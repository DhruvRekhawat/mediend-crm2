'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileText, Maximize2, ExternalLink, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useSwipeable } from 'react-swipeable'

interface Attachment {
  name: string
  url: string
  type: string
}

interface AttachmentCarouselProps {
  attachments: Attachment[]
}

export function AttachmentCarousel({ attachments }: AttachmentCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null)

  const handlers = useSwipeable({
    onSwipedLeft: () => setCurrentIndex((prev) => Math.min(prev + 1, attachments.length - 1)),
    onSwipedRight: () => setCurrentIndex((prev) => Math.max(prev - 1, 0)),
    trackMouse: true,
  })

  if (!attachments || attachments.length === 0) return null

  const current = attachments[currentIndex]
  const isImage = current.type.startsWith('image/')

  return (
    <div className="space-y-2">
      <div className="relative group bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden aspect-[4/5] sm:aspect-video flex items-center justify-center border shadow-inner">
        {/* Swipe Area */}
        <div {...handlers} className="w-full h-full flex items-center justify-center cursor-pointer overflow-hidden p-2">
           {isImage ? (
             <img 
               src={current.url} 
               alt={current.name} 
               className="max-w-full max-h-full object-contain hover:scale-105 transition-transform duration-300"
               onClick={() => {
                 setSelectedAttachment(current)
                 setIsFullscreen(true)
               }}
             />
           ) : (
             <div 
               className="flex flex-col items-center gap-4 p-8 text-center"
               onClick={() => {
                setSelectedAttachment(current)
                setIsFullscreen(true)
               }}
             >
               <FileText className="h-20 w-20 text-red-500 drop-shadow-sm" />
               <div>
                 <p className="font-semibold text-lg line-clamp-2">{current.name}</p>
                 <p className="text-sm text-muted-foreground uppercase mt-1">PDF DOCUMENT</p>
               </div>
               <Button variant="secondary" size="sm" className="mt-2 rounded-full px-6">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Preview
               </Button>
             </div>
           )}
        </div>

        {/* Navigation Buttons */}
        {attachments.length > 1 && (
          <>
            <button 
              onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
              disabled={currentIndex === 0}
              className={`absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 dark:bg-black/80 shadow-md transition-opacity ${currentIndex === 0 ? 'opacity-0 cursor-default' : 'opacity-0 group-hover:opacity-100'}`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button 
              onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, attachments.length - 1))}
              disabled={currentIndex === attachments.length - 1}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 dark:bg-black/80 shadow-md transition-opacity ${currentIndex === attachments.length - 1 ? 'opacity-0 cursor-default' : 'opacity-0 group-hover:opacity-100'}`}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Fullscreen Trigger */}
        <button 
          onClick={(e) => {
            e.stopPropagation()
            setSelectedAttachment(current)
            setIsFullscreen(true)
          }}
          className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Maximize2 className="h-4 w-4" />
        </button>

        {/* Counter Overlay */}
        {attachments.length > 1 && (
          <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/50 text-white text-[10px] font-bold backdrop-blur-sm">
            {currentIndex + 1} / {attachments.length}
          </div>
        )}

        {/* Pagination Dots */}
        {attachments.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 p-1.5 rounded-full bg-black/20 backdrop-blur-[2px]">
            {attachments.map((_, i) => (
              <div 
                key={i} 
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? 'bg-white w-4' : 'bg-white/40'}`} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 overflow-hidden bg-black flex flex-col items-center justify-center border-none">
          <DialogHeader className="absolute top-4 left-4 right-4 z-50 flex-row items-center justify-between pointer-events-none">
            <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 max-w-[70%]">
               <DialogTitle className="text-white text-sm font-medium truncate leading-none mb-0">
                  {selectedAttachment?.name}
               </DialogTitle>
            </div>
            <Button 
               variant="ghost" 
               size="icon" 
               className="rounded-full bg-white/10 hover:bg-white/20 text-white pointer-events-auto h-10 w-10 border border-white/20"
               onClick={() => setIsFullscreen(false)}
            >
               <X className="h-5 w-5" />
            </Button>
          </DialogHeader>
          
          <div className="w-full h-full flex items-center justify-center p-4">
            {selectedAttachment?.type.startsWith('image/') ? (
              <img 
                src={selectedAttachment.url} 
                alt={selectedAttachment.name} 
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <iframe 
                src={selectedAttachment?.url} 
                className="w-full h-full rounded-lg bg-white"
                title={selectedAttachment?.name}
              />
            )}
          </div>

          <div className="absolute bottom-6 flex items-center gap-4">
            <a 
              href={selectedAttachment?.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-full hover:bg-white/90 transition-all shadow-lg active:scale-95"
            >
              <ExternalLink className="h-4 w-4" />
              Open in New Tab
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
