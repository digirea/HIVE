#include "VolumeToVector.h"

VolumeToVector::VolumeToVector(){
    m_tetra = new BufferTetraData();
}


inline void GenerateTetra(
  float* out_vertices,
  float* in_vertices, double bmin[3], double bmax[3], double scale)
{
  double u0 = in_vertices[0];
  double u1 = in_vertices[1];
  double u2 = in_vertices[2];

  //TODO const
  double offset[4][3];
  offset[0][0] = 1.0;
  offset[0][1] = 0.0;
  offset[0][2] = 0.0;
  offset[1][0] = 1.0;
  offset[1][1] = 0.0;
  offset[1][2] = 1.0;
  offset[2][0] = 0.0;
  offset[2][1] = 0.0;
  offset[2][2] = 1.0;
  offset[3][0] = 0.0;
  offset[3][1] = 1.0;
  offset[3][2] = 0.0;

  double px = (bmax[0] - bmin[0]) * u0 + bmin[0];
  double py = (bmax[1] - bmin[1]) * u1 + bmin[1];
  double pz = (bmax[2] - bmin[2]) * u2 + bmin[2];
  for (size_t j = 0; j < 4; j++) {
    double v0 = scale * (bmax[0] - bmin[0]) * offset[j][0];
    double v1 = scale * (bmax[1] - bmin[1]) * offset[j][1];
    double v2 = scale * (bmax[2] - bmin[2]) * offset[j][2];
    out_vertices[3 * (4 * j) + 0] = px + v0;
    out_vertices[3 * (4 * j) + 1] = py + v1;
    out_vertices[3 * (4 * j) + 2] = pz + v2;
  }
}

int VolumeToVector::Create(BufferVolumeData *volume, double scale, double radius) {
    if (!volume || scale <= 0.0) {
        return 0;
    }

    //todo custom
    double bmin[3] = {-1, -1, -1};
    double bmax[3] = { 1,  1,  1};
    
    const  int width            = volume->Width();
    const  int height           = volume->Height();
    const  int depth            = volume->Depth();
    const  int volume_num       = (width * height * depth);
    
    //Create line
    const  int line_vertex_num  = volume_num * 2;
    const  int indexnum         = 0;//obj.GetIndexNum()
    m_line->Create(line_vertex_num, indexnum);

    Vec3Buffer*  pos     = m_line->Position();
    FloatBuffer* mat     = m_line->Material();
    FloatBuffer* radius  = m_line->Radius();
    UintBuffer*  idx     = m_line->Index();

    for(int k = 0; k < depth; k++) {
        for(int j = 0; j < height; j++) {
            for(int i = 0; i < width; i++) {
                
            }
        }
    }

    //1cell 1tetra
    int tetra_vertex_num = volume_num * 4;
    
    //Create TetraData
    float *source        = volume->Buffer()->GetBuffer();
    m_tetra->Create(tetra_vertex_num, tetra_vertex_num);
    float *dest          = m_tetra->Position()->GetBuffer();
    
    //GenerateTetra
    for (int i = 0; i < volume_num; ++i){
        GenerateTetra(&dest[i * 4], &source[i * 3], bmin, bmax, scale);
    }

    /*
    //Create TetraVertexBuffer
    const int vnum = obj->GetVertexNum();

    m_line->Create(vnum, indexnum);
    Vec3Buffer*  pos     = m_line->Position();
    FloatBuffer* mat     = m_line->Material();
    FloatBuffer* radius  = m_line->Radius();
    UintBuffer*  idx     = m_line->Index();

    //position
    float* pp = pos->GetBuffer();
    
    memcpy(pp, obj->GetPositionBuffer(), sizeof(float)*3*( vnum ));
    
    
    float* rad = radius->GetBuffer();
    if (rad) {
        for (int i = 0; i < vnum; ++i) {
            rad[i] = static_cast<float>(radius);
        }
    }
    memset(mat->GetBuffer(), 0, sizeof(float) * mat->GetNum());
    
    if (indexnum)
        memcpy(idx->GetBuffer(), obj->GetIndex(), sizeof(unsigned int) * idx->GetNum());
    */
    
    return m_tetra->Position()->GetNum();
}

BufferTetraData* VolumeToVector::TetraData()
{
    return m_tetra;
}

BufferTetraData* VolumeToVector::LineData()
{
    return m_line;
}


