import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { WizardStepper } from '@/components/agent/AgentStepper'
import { MapBuilderForm } from './MapBuilderForm'
import { MapBuildProgress } from './MapBuildProgress'
import { useMapBuilderForm, MAP_WIZARD_STEPS, MAP_STEP_INDEX } from './useMapBuilder'
import { ROUTES } from '@/constants'

export default function MapBuilderPage() {
  const navigate = useNavigate()
  const { step, currentTask, createMutation, reset } = useMapBuilderForm()

  const handleComplete = (jobId: string) => {
    navigate(ROUTES.AGENT_MAP_BUILDER_JOB(jobId))
  }

  return (
    <div>
      <PageHeader
        title="Tạo bản đồ offline cho địa điểm"
        description="Nhập thông tin địa điểm và BBOX, AI sẽ build bản đồ offline."
      />

      {/* Stepper */}
      <div className="bg-white border border-border rounded-lg p-5 shadow-card mb-6">
        <WizardStepper steps={MAP_WIZARD_STEPS} activeStep={MAP_STEP_INDEX[step]} />
      </div>

      <div className="bg-white border border-border rounded-lg p-6 shadow-card">
        {step === 'form' && (
          <>
            <h2 className="text-base font-semibold text-foreground mb-1">Bước 1: Nhập thông tin</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Chọn địa điểm, nhập BBOX và cấu hình bản đồ.
            </p>
            <MapBuilderForm
              onSubmit={(data) => createMutation.mutate(data)}
              isLoading={createMutation.isPending}
            />
          </>
        )}

        {step === 'processing' && currentTask && (
          <>
            <h2 className="text-base font-semibold text-foreground mb-1">Bước 2: Xử lý dữ liệu</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Hệ thống đang build bản đồ offline.
            </p>
            <MapBuildProgress task={currentTask} onComplete={handleComplete} />
            <button
              onClick={reset}
              className="mt-4 text-sm text-muted-foreground hover:text-foreground underline"
            >
              Hủy và quay lại
            </button>
          </>
        )}
      </div>
    </div>
  )
}
