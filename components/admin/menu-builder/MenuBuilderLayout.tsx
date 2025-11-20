"use client"

interface MenuBuilderLayoutProps {
  leftPanel: React.ReactNode
  rightPanel: React.ReactNode
  showPreview: boolean
}

export function MenuBuilderLayout({ leftPanel, rightPanel, showPreview }: MenuBuilderLayoutProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-screen">
      {/* Left Panel - Menu Editor */}
      <div className={showPreview ? "lg:w-2/3 flex-1" : "w-full"}>
        {leftPanel}
      </div>

      {/* Right Panel - Live Preview */}
      {showPreview && (
        <div className="lg:w-1/3 flex-shrink-0">
          {rightPanel}
        </div>
      )}
    </div>
  )
}
