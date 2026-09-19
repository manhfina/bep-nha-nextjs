'use client';

export default function CookModeModal({
  recipe,
  step,
  onClose,
  onPrevStep,
  onNextStep,
}) {
  if (!recipe) return null;

  const totalSteps = recipe.steps ? recipe.steps.length : 0;
  const currentStepText = recipe.steps ? recipe.steps[step] : '';
  const progress = totalSteps > 0 ? Math.round(((step + 1) / totalSteps) * 100) : 0;

  return (
    <div style={cookStyles.overlay}>
      <div style={cookStyles.modal}>
        {/* Nút thoát */}
        <button onClick={onClose} style={cookStyles.closeBtn}>
          ✕ Thoát
        </button>

        {/* Thanh tiến độ */}
        <div style={cookStyles.header}>
          <div style={cookStyles.meta}>
            <span style={cookStyles.badge}>🔥 Đang nấu</span>
            <span style={cookStyles.recipeName}>{recipe.title}</span>
          </div>
          <div style={cookStyles.progressBarBg}>
            <div style={{ ...cookStyles.progressBarFill, width: `${progress}%` }} />
          </div>
          <div style={cookStyles.stepCount}>
            Bước {step + 1} / {totalSteps} ({progress}%)
          </div>
        </div>

        {/* Nội dung bước nấu */}
        <div style={cookStyles.body}>
          <div style={cookStyles.stepBadge}>Bước {step + 1}</div>
          <p style={cookStyles.stepInstruction}>{currentStepText}</p>
        </div>

        {/* Nút điều hướng */}
        <div style={cookStyles.footer}>
          <button
            onClick={onPrevStep}
            disabled={step === 0}
            style={{
              ...cookStyles.btnNav,
              opacity: step === 0 ? 0.4 : 1,
              cursor: step === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            ⬅ Bước trước
          </button>
          <button onClick={onNextStep} style={cookStyles.btnNext}>
            {step === totalSteps - 1 ? '🎉 Hoàn thành' : 'Bước tiếp theo ➡'}
          </button>
        </div>
      </div>
    </div>
  );
}

const cookStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '24px',
    maxWidth: '560px',
    width: '100%',
    padding: '28px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
    position: 'relative',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    boxSizing: 'border-box',
  },
  closeBtn: {
    position: 'absolute',
    top: '18px',
    right: '20px',
    background: '#f1f2f6',
    border: 'none',
    borderRadius: '12px',
    padding: '6px 14px',
    cursor: 'pointer',
    fontWeight: '600',
    color: '#666',
    fontSize: '0.85rem',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    textAlign: 'left',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  badge: {
    backgroundColor: '#ff7675',
    color: '#fff',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    padding: '2px 8px',
    borderRadius: '20px',
  },
  recipeName: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#2d3436',
  },
  progressBarBg: {
    width: '100%',
    height: '8px',
    backgroundColor: '#f1f2f6',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#e67e22',
    transition: 'width 0.3s ease',
  },
  stepCount: {
    fontSize: '0.8rem',
    color: '#95a5a6',
    textAlign: 'right',
  },
  body: {
    padding: '24px 16px',
    backgroundColor: '#fdfbf7',
    borderRadius: '18px',
    border: '1px solid #fae5cc',
    minHeight: '140px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
  stepBadge: {
    backgroundColor: '#e67e22',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    padding: '4px 12px',
    borderRadius: '12px',
  },
  stepInstruction: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#2d3436',
    lineHeight: '1.6',
    margin: 0,
  },
  footer: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'space-between',
  },
  btnNav: {
    flex: 1,
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid #dcdde1',
    backgroundColor: '#fff',
    fontWeight: '600',
    color: '#2d3436',
  },
  btnNext: {
    flex: 1,
    padding: '12px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#e67e22',
    color: '#fff',
    fontWeight: '700',
    cursor: 'pointer',
  },
};