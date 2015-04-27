/**
 * @file TetraBuffer.cpp
 * Tetraバッファ
 */
#include <string>

#include "TetraBuffer.h"
#include "BufferTetraData.h"
#include "../RenderObject/TetraModel.h"
#include "Buffer.h"
#include "Commands.h"

/// コンストラクタ
TetraBuffer::TetraBuffer(RENDER_MODE mode) : BaseBuffer(mode)
{
    m_model       = 0;
    m_vtxnum      = 0;
    m_vtx_id      = 0;
    m_material_id = 0;
}

/// デストラクタ
TetraBuffer::~TetraBuffer()
{
    Clear();
}

/// クリア
void TetraBuffer::Clear()
{
    if (m_vtx_id)      ReleaseBufferVBIB_SGL(m_vtx_id);
    if (m_material_id) ReleaseBufferVBIB_SGL(m_material_id);
    m_vtx_id      = 0;
    m_material_id = 0;
    m_vtxnum      = 0;
    m_model       = 0;
}

/**
 * Tetraバッファの作成.
 * @param model Tetraモデル.
 */
bool TetraBuffer::Create(const TetraModel* model)
{
    bool r = true;
    if (!model) {
        fprintf(stderr,"Failed to create line: ");
        return false;
    }
    
    m_model = model;

    // load shader
    const std::string& shadername = model->GetShader();
    printf("%s\n", shadername.c_str());
    r &= loadShaderSrc(shadername.c_str());
    if (!r) {
        fprintf(stderr,"[Error] A shader is not set\n");
        return false;
    }

    BufferTetraData* tetra = model->GetTetra();
    if (!tetra) {
        fprintf(stderr,"[Error] Invalid tetra data\n");
        return false;
    }
    const int vnum = tetra->Position()->GetNum();
    
    m_vtxnum = vnum;
    if (vnum == 0)
        return false;
    
	// Create tetra VB/IB
	unsigned int normal_id, mat_id, tex_id, index_id;
    CreateVBIB_SGL(vnum, tetra->Position()->GetBuffer(),
                   /* normal */ 0,
                   /* material(todo) */ 0,
                   /* texcoord */ 0,
                   /* numIndices */ 0,
				   /* indices */ 0,
                   m_vtx_id, normal_id, mat_id, tex_id, index_id);
    
    
    cacheTextures(model);
    
    return r;
}

/**
 * レンダー.
 */
void TetraBuffer::Render() const
{
    if (!m_model) {
        fprintf(stderr,"[Error] Not set vectormodel\n");
    }
    
    if (m_vtxnum == 0) {
        fprintf(stderr,"[Error] Invalid tetra data\n");
        return;
    }

    bindUniforms(m_model);

    BindTetraVBIB_SGL(getProgram(), m_vtx_id, 0, 0);
	// Use draw array method.
    DrawTetraArrays_SGL(m_vtxnum);
}


