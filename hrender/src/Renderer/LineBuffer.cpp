#include <string>

#include "Analyzer.h"
#include "LineBuffer.h"
#include "BufferLineData.h"
#include "../RenderObject/LineModel.h"
#include "Buffer.h"
#include "Commands.h"

LineBuffer::LineBuffer(RENDER_MODE mode) : BaseBuffer(mode)
{
    m_vtxnum      = 0;
    m_indexnum    = 0;
    m_model       = 0;
    m_vtx_id      = 0;
    m_radius_id   = 0;
    m_material_id = 0;
    m_idx_id      = 0;
}

LineBuffer::~LineBuffer()
{
    Clear();
}

void LineBuffer::Clear()
{
    if (m_vtx_id)      ReleaseBufferVBIB_SGL(m_vtx_id);
    if (m_radius_id)   ReleaseBufferVBIB_SGL(m_radius_id);
    if (m_material_id) ReleaseBufferVBIB_SGL(m_material_id);
    if (m_idx_id)      ReleaseBufferVBIB_SGL(m_idx_id);
    m_vtx_id      = 0;
    m_radius_id   = 0;
    m_material_id = 0;
    m_idx_id      = 0;
    m_vtxnum      = 0;
    m_indexnum    = 0;
}

bool LineBuffer::Create(const LineModel* model)
{
    bool r = true;
    if (!model) {
        printf("Failed to create line: ");
        return false;
    }
    
    m_model = model;

    // load shader
    const std::string& shadername = model->GetShader();
    printf("%s\n", shadername.c_str());
    r &= loadShaderSrc(shadername.c_str());
    if (!r) {
        printf("[Error]Not set shader\n");
        return false;
    }

    // make LineData
    BufferLineData* line = model->GetLine();
    if (!line) {
        printf("[Error]Invalid line data\n");
        return false;
    }
    unsigned int linePointNum = line->Position()->GetNum();
    if (linePointNum <= 0) {
        printf("[Error]Point vertex empty\n");
        return false;
    }
    
    m_vtxnum   = linePointNum;
    m_indexnum = line->Index()->GetNum();
    if (linePointNum <= 0) {
        printf("[Error]Line vertex empty\n");
        return false;
    }
    if (!m_indexnum) {
        CreateVBRM_SGL(linePointNum,
                       line->Position()->GetBuffer(),
                       line->Radius()->GetBuffer(),
                       line->Material()->GetBuffer(),
                       m_vtx_id, m_radius_id, m_material_id);
    } else {
        CreateVBIBRM_SGL(linePointNum,
                         line->Position()->GetBuffer(),
                         line->Radius()->GetBuffer(),
                         line->Material()->GetBuffer(),
                         m_indexnum,
                         line->Index()->GetBuffer(),
                         m_vtx_id, m_radius_id, m_material_id, m_idx_id);
    }
    
    return r;
}

void LineBuffer::Render() const
{
    if (!m_model) {
        printf("[Error] Not set linemodel\n");
    }
    
    if (m_vtxnum == 0) {
        printf("[Error] Invalide line data\n");
        return;
    }

    bindUniforms(m_model);
    
    float w = m_model->GetLineWidth();
    LineWidth_SGL(w);
    
    BindLineVBIB_SGL(getProgram(), m_vtx_id, m_radius_id, m_material_id, m_idx_id);
    if (!m_indexnum)
        DrawLineArrays_SGL(m_vtxnum);
    else
        DrawLineElements_SGL(m_indexnum);
}


