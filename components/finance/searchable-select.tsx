'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface SearchableSelectProps<T> {
  value?: string
  onValueChange: (value: string) => void
  options: T[]
  getOptionLabel: (option: T) => string
  getOptionValue: (option: T) => string
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  createLabel?: string
  onShowCreateDialog?: (searchValue: string) => void
  required?: boolean
  className?: string
}

export function SearchableSelect<T>({
  value,
  onValueChange,
  options,
  getOptionLabel,
  getOptionValue,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found.',
  createLabel = 'Create new',
  onShowCreateDialog,
  required = false,
  className,
}: SearchableSelectProps<T>) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState('')

  const selectedOption = options.find((opt) => getOptionValue(opt) === value)
  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return options
    const searchLower = searchValue.toLowerCase()
    return options.filter((opt) =>
      getOptionLabel(opt).toLowerCase().includes(searchLower)
    )
  }, [options, searchValue, getOptionLabel])

  const showCreateOption = searchValue && filteredOptions.length === 0 && onShowCreateDialog

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn('w-full justify-between', className)}
          >
            {selectedOption ? getOptionLabel(selectedOption) : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput
              placeholder={searchPlaceholder}
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>
                {showCreateOption ? (
                  <div className="py-2 px-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        if (onShowCreateDialog) {
                          onShowCreateDialog(searchValue)
                          setOpen(false)
                          setSearchValue('')
                        }
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {createLabel}: {searchValue}
                    </Button>
                  </div>
                ) : (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {emptyMessage}
                  </div>
                )}
              </CommandEmpty>
              <CommandGroup>
                {filteredOptions.map((option) => {
                  const optionValue = getOptionValue(option)
                  const optionLabel = getOptionLabel(option)
                  return (
                    <CommandItem
                      key={optionValue}
                      value={optionValue}
                      onSelect={() => {
                        onValueChange(optionValue)
                        setOpen(false)
                        setSearchValue('')
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === optionValue ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {optionLabel}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  )
}
