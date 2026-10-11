import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Pagination } from '@/components/ui/Pagination'

describe('Pagination', () => {
  it('renders page info correctly', () => {
    render(<Pagination page={1} totalPages={5} total={47} limit={10} onPageChange={vi.fn()} />)
    expect(screen.getByText(/Hiển thị 1-10 trong 47/)).toBeInTheDocument()
  })

  it('prev button disabled on first page', () => {
    render(<Pagination page={1} totalPages={5} total={50} limit={10} onPageChange={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toBeDisabled()
  })

  it('next button disabled on last page', () => {
    render(<Pagination page={5} totalPages={5} total={50} limit={10} onPageChange={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons[buttons.length - 1]).toBeDisabled()
  })

  it('calls onPageChange with correct page number', () => {
    const onPageChange = vi.fn()
    render(<Pagination page={2} totalPages={5} total={50} limit={10} onPageChange={onPageChange} />)
    // Find and click prev button
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    expect(onPageChange).toHaveBeenCalledWith(1)
  })
})
