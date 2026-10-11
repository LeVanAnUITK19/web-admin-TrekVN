import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from '@/components/ui/StatusBadge'

describe('StatusBadge', () => {
  it('renders ACTIVE status in Vietnamese', () => {
    render(<StatusBadge status="ACTIVE" />)
    expect(screen.getByText('Hoạt động')).toBeInTheDocument()
  })

  it('renders BLOCKED status', () => {
    render(<StatusBadge status="BLOCKED" />)
    expect(screen.getByText('Đã khóa')).toBeInTheDocument()
  })

  it('renders PENDING_REVIEW status', () => {
    render(<StatusBadge status="PENDING_REVIEW" />)
    expect(screen.getByText('Chờ duyệt')).toBeInTheDocument()
  })

  it('renders custom label when provided', () => {
    render(<StatusBadge status="ACTIVE" label="Custom Label" />)
    expect(screen.getByText('Custom Label')).toBeInTheDocument()
  })

  it('falls back to raw status for unknown values', () => {
    render(<StatusBadge status="UNKNOWN_STATUS" />)
    expect(screen.getByText('UNKNOWN_STATUS')).toBeInTheDocument()
  })
})
